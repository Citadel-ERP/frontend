import React, { useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Booking } from './types';
import { formatDateTime, getStatusColor, getStatusText } from './utils';

interface MyBookingsScreenProps {
    bookings: Booking[];
    loading: boolean;
    onBackToBooking: () => void;
    onCancelBooking: (booking: Booking) => void;
}

const MyBookingsScreen: React.FC<MyBookingsScreenProps> = ({
    bookings,
    loading,
    onBackToBooking,
    onCancelBooking
}) => {
    return (
        <View style={styles.screenContainer}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>My Bookings</Text>
            </View>

            <ScrollView style={styles.cabsList}>
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
                            onPress={onBackToBooking}
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
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    screenContainer: {
        flex: 1,
    },
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
    headerTitle: {
        fontSize: 24,
        fontWeight: '600',
        color: '#fff',
    },
    cabsList: {
        flex: 1,
        padding: 20,
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
});

export default MyBookingsScreen;