import React from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Image
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Booking } from './types';
import { formatDateTime, getStatusColor, getStatusText } from './utils';
import { colors } from '../../styles/theme';

interface MyBookingsScreenProps {
    bookings: Booking[];
    loading: boolean;
    onBack: () => void;
    onCancelBooking: (booking: Booking) => void;
    onRefresh?: () => void;
}

const BackIcon = () => (
    <View style={styles.backIcon}>
        <View style={styles.backArrow} /><Text style={styles.backText}>Back</Text>
    </View>
);

const MyBookingsScreen: React.FC<MyBookingsScreenProps> = ({
    bookings,
    loading,
    onBack,
    onCancelBooking,
    onRefresh
}) => {
    return (
        <View style={styles.screenContainer}>
            <ScrollView
                style={styles.scrollContainer}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Header inside ScrollView */}
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
                                <Text style={styles.logoText}>CITADEL</Text>
                                <View style={{ width: 32 }} />
                            </View>
                        </View>
                        <View style={styles.titleSection}>
                            <Text style={styles.headerTitle}>My Bookings</Text>
                        </View>
                    </LinearGradient>
                </View>

                {/* Bookings Content */}
                <View style={styles.cabsListContent}>
                    {loading && bookings.length === 0 ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color="#017bf9" />
                            <Text style={styles.loadingText}>Loading bookings...</Text>
                        </View>
                    ) : bookings.length === 0 ? (
                        <View style={styles.emptyState}>
                            <MaterialCommunityIcons name="car" size={64} color="#ccc" />
                            <Text style={styles.emptyText}>No bookings yet</Text>
                            <TouchableOpacity
                                style={styles.searchBtn}
                                onPress={onBack}
                            >
                                <Text style={styles.searchBtnText}>Book Your First Ride</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        bookings.map((booking) => (
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
                                        onPress={() => onCancelBooking(booking)}
                                    >
                                        <Text style={styles.cancelBtnText}>Cancel Booking</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        ))
                    )}
                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    screenContainer: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    scrollContainer: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
    },
    header: {
        height: 180,
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
        paddingVertical: 40,
        position: 'relative',
        zIndex: 1,
    },
    headerTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    backBtn: {
        padding: 5,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '600',
        color: '#fff',
    },
    cabsListContent: {
        padding: 20,
        paddingBottom: 100,
    },
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
    locationText: {
        flex: 1,
        color: '#333',
        fontSize: 14,
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
    logoText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '800',
        letterSpacing: 1,
        textAlign: 'center',
        marginRight: 10,
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
    titleSection: {
        paddingHorizontal: 20,
        paddingVertical: 25,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
    },
    searchBtn: {
        backgroundColor: '#00d285',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    searchBtnText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
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
});

export default MyBookingsScreen;