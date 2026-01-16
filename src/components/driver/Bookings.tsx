import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    Alert,
    ActivityIndicator,
    Image,
    TextInput,
    Animated,
    Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { styles } from './styles';
import { VehicleImage } from './VehicleImage';
import { Booking, VehicleAssignment } from './types';
import { BACKEND_URL } from '../../config/config';
import { formatDate, formatDateTime, getStatusColor, getStatusIconBooking } from './utils';

const BackIcon = () => (
    <View style={styles.backIcon}>
        <View style={styles.backArrow} />
        <Text style={styles.backText}>Back</Text>
    </View>
);

interface BookingsProps {
    token: string | null;
    onBack: () => void;
    setActiveTab: (tab: 'vehicles' | 'bookings') => void;
    activeTab: 'vehicles' | 'bookings';
    setLoading: (loading: boolean) => void;
    loading: boolean;
}

type ExtendedBooking = Booking & {
    vehicle_assignments?: VehicleAssignment[];
};

const BookingCard: React.FC<{
    booking: ExtendedBooking;
    index: number;
    onUpdateStatus: (bookingId: number, status: string, reason?: string) => void;
    updating: boolean;
}> = ({ booking, index, onUpdateStatus, updating }) => {
    const slideAnim = useRef(new Animated.Value(30)).current;
    const [selectedStatus, setSelectedStatus] = useState(booking.status);
    const [showCancellationInput, setShowCancellationInput] = useState(false);
    const [cancellationReason, setCancellationReason] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);

    useEffect(() => {
        Animated.timing(slideAnim, {
            toValue: 0,
            duration: 400,
            delay: index * 100,
            useNativeDriver: true,
        }).start();
    }, []);

    const handleStatusChange = (status: string) => {
        setSelectedStatus(status);
        if (status === 'cancelled') {
            setShowCancellationInput(true);
        } else {
            setShowCancellationInput(false);
            setCancellationReason('');
        }
    };

    const handleUpdateStatus = async () => {
        if (selectedStatus === 'cancelled' && !cancellationReason.trim()) {
            Alert.alert('Error', 'Please provide a reason for cancellation');
            return;
        }
        if (selectedStatus === booking.status && selectedStatus !== 'cancelled') {
            Alert.alert('Info', 'Status is already set to ' + selectedStatus);
            return;
        }

        // Get the assignment ID from the first vehicle assignment
        const assignmentId = booking.vehicle_assignments?.[0]?.id;
        if (!assignmentId) {
            Alert.alert('Error', 'Assignment ID not found');
            return;
        }

        setIsUpdating(true);
        await onUpdateStatus(assignmentId, selectedStatus, cancellationReason);
        setIsUpdating(false);
        setShowCancellationInput(false);
        setCancellationReason('');
    };

    const assignments = booking.vehicle_assignments || [];
    const hasMultipleVehicles = assignments.length > 1;
    const firstVehicle = assignments.length > 0 ? assignments[0].vehicle : null;

    return (
        <Animated.View style={[styles.bookingCard, { transform: [{ translateY: slideAnim }] }]}>
            {/* Header */}
            <View style={styles.bookingCardHeader}>
                <View style={styles.vehicleInfo}>
                    {booking.vehicle && <VehicleImage vehicle={booking.vehicle} size="small" />}
                    <View style={{ marginLeft: 12, flex: 1 }}>
                        <Text style={styles.vehicleName}>
                            {hasMultipleVehicles
                                ? `${assignments.length} Vehicles`
                                : firstVehicle
                                    ? `${firstVehicle.make} ${firstVehicle.model}`
                                    : booking.vehicle
                                        ? `${booking.vehicle.make} ${booking.vehicle.model}`
                                        : 'Vehicle'}
                        </Text>
                        <Text style={styles.plateText}>
                            {booking.vehicle_assignments?.[0]?.vehicle.license_plate || 'N/A'}
                        </Text>
                    </View>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(booking.status)}20` }]}>
                    <MaterialCommunityIcons
                        name={getStatusIconBooking(booking.status)}
                        size={14}
                        color={getStatusColor(booking.status)}
                    />
                    <Text style={[styles.statusText, { color: getStatusColor(booking.status) }]}>
                        {booking.status}
                    </Text>
                </View>
            </View>

            {/* Body */}
            <View style={styles.bookingCardBody}>
                <View style={styles.locationRow}>
                    <MaterialCommunityIcons name="account" size={16} color="#666" />
                    <Text style={styles.locationText}>
                        {booking.booked_for?.full_name || 'Unknown'}
                    </Text>
                </View>
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
                {booking.purpose && (
                    <View style={styles.locationRow}>
                        <MaterialCommunityIcons name="information" size={16} color="#666" />
                        <Text style={styles.locationText}>{booking.purpose}</Text>
                    </View>
                )}
            </View>

            {/* Footer - Date & Time */}
            <View style={styles.bookingCardFooter}>
                <View style={styles.dateTimeInfo}>
                    <MaterialCommunityIcons name="calendar" size={16} color="#666" />
                    <Text style={styles.dateTimeInfoText}>
                        {new Date(booking.start_time).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
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

            {/* End Date & Time Section - Matching Cab Booking file */}
            {booking.end_time && (
                <View style={[styles.bookingCardFooter, { paddingTop: 8, borderTopWidth: 0 }]}>
                    <View style={styles.dateTimeInfo}>
                        <MaterialCommunityIcons name="calendar" size={16} color="#666" />
                        <Text style={styles.dateTimeInfoText}>
                            {new Date(booking.end_time).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                            })}
                        </Text>
                    </View>
                    <View style={styles.dateTimeInfo}>
                        <MaterialCommunityIcons name="clock-outline" size={16} color="#666" />
                        <Text style={styles.dateTimeInfoText}>
                            {new Date(booking.end_time).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit'
                            })}
                        </Text>
                    </View>
                </View>
            )}

            {/* Status Update Section */}
            <View style={{ marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#f0f0f0' }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 12 }}>
                    Update Status
                </Text>
                <View style={styles.statusOptions}>
                    {['Assigned', 'in-progress', 'completed', 'cancelled'].map((status) => {
                        const statusColor = getStatusColor(status);
                        const isSelected = selectedStatus === status;
                        return (
                            <TouchableOpacity
                                key={status}
                                style={[
                                    styles.statusOption,
                                    isSelected && { backgroundColor: statusColor, borderColor: statusColor }
                                ]}
                                onPress={() => handleStatusChange(status)}
                            >
                                <MaterialCommunityIcons
                                    name={getStatusIconBooking(status)}
                                    size={16}
                                    color={isSelected ? '#FFFFFF' : statusColor}
                                />
                                <Text
                                    style={[
                                        styles.statusOptionText,
                                        { color: isSelected ? '#FFFFFF' : statusColor }
                                    ]}
                                >
                                    {status.toUpperCase()}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* Cancellation Reason Input */}
                {showCancellationInput && (
                    <View style={{ marginTop: 12 }}>
                        <View style={styles.inputContainer}>
                            <MaterialIcons name="warning" size={20} color="#FF3B30" style={styles.inputIcon} />
                            <TextInput
                                style={[styles.textInput, { minHeight: 80 }]}
                                value={cancellationReason}
                                onChangeText={setCancellationReason}
                                placeholder="Reason for cancellation (required)"
                                placeholderTextColor="#888"
                                multiline
                                numberOfLines={3}
                                textAlignVertical="top"
                            />
                        </View>
                    </View>
                )}

                {/* Update Button */}
                {selectedStatus !== booking.status && (
                    <TouchableOpacity
                        style={[
                            styles.updateButton,
                            { marginTop: 12 },
                            (isUpdating || updating) && { backgroundColor: '#ccc' }
                        ]}
                        onPress={handleUpdateStatus}
                        disabled={isUpdating || updating}
                    >
                        {isUpdating || updating ? (
                            <ActivityIndicator color="#FFFFFF" size="small" />
                        ) : (
                            <>
                                <MaterialCommunityIcons name="check-circle" size={20} color="#FFFFFF" />
                                <Text style={styles.updateButtonText}>Update to {selectedStatus}</Text>
                            </>
                        )}
                    </TouchableOpacity>
                )}
            </View>
        </Animated.View>
    );
};

const Bookings: React.FC<BookingsProps> = ({
    token,
    onBack,
    setActiveTab,
    activeTab,
    setLoading,
    loading,
}) => {
    const [bookings, setBookings] = useState<ExtendedBooking[]>([]);
    const [updating, setUpdating] = useState(false);
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (token) {
            fetchBookings();
        }
    }, [token]);

    useEffect(() => {
        if (!loading && bookings.length > 0) {
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 400,
                useNativeDriver: true,
            }).start();
        }
    }, [loading, bookings]);

    const fetchBookings = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${BACKEND_URL}/employee/getCarBookings`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ token }),
            });

            const text = await response.text();

            if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
                try {
                    const data = JSON.parse(text);
                    if (response.ok) {
                        const bookingsData = data.bookings || [];
                        if (Array.isArray(bookingsData)) {
                            const sortedBookings = [...bookingsData].sort((a: ExtendedBooking, b: ExtendedBooking) =>
                                new Date(b.created_at || b.start_time || 0).getTime() - new Date(a.created_at || a.start_time || 0).getTime()
                            );
                            setBookings(sortedBookings);
                        } else {
                            setBookings([]);
                        }
                    } else {
                        setBookings([]);
                    }
                } catch (parseError) {
                    console.error('Failed to parse bookings JSON:', parseError);
                    setBookings([]);
                }
            } else {
                setBookings([]);
            }
        } catch (error) {
            console.error('Error fetching bookings:', error);
            setBookings([]);
        } finally {
            setLoading(false);
        }
    };

    const updateBookingStatus = async (assignmentId: number, status: string, reason?: string) => {
        setUpdating(true);
        try {
            const requestBody: any = {
                token,
                assignment_id: assignmentId,  // Changed from booking_id
                status: status,
            };
            if (status === 'cancelled' && reason) {
                requestBody.reason_of_cancellation = reason;
            }
            const response = await fetch(`${BACKEND_URL}/employee/updateCarBookings`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(requestBody),
            });
            const text = await response.text();
            if (text.trim().startsWith('{')) {
                try {
                    const data = JSON.parse(text);
                    if (response.ok) {
                        Alert.alert('Success', 'Booking status updated successfully!');
                        fetchBookings();
                    } else {
                        Alert.alert('Error', data.message || 'Failed to update booking status');
                    }
                } catch (parseError) {
                    console.error('Failed to parse update booking response:', parseError);
                    Alert.alert('Error', 'Invalid response from server');
                }
            } else {
                Alert.alert('Error', 'Invalid response from server');
            }
        } catch (error) {
            console.error('Error updating booking status:', error);
            Alert.alert('Error', 'Network error occurred');
        } finally {
            setUpdating(false);
        }
    };

    return (
        <View style={styles.screenContainer}>
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

                        <View style={[styles.titleSection]}>
                            <Text style={styles.sectionTitle}>Manage Bookings</Text>
                            <Text style={styles.sectionSubtitle}>
                                {bookings.length} booking{bookings.length !== 1 ? 's' : ''} found
                            </Text>
                        </View>
                    </LinearGradient>
                </View>

                <View style={styles.tabContainer}>
                    <TouchableOpacity
                        style={[styles.tabButton, activeTab === 'vehicles' && styles.activeTabButton]}
                        onPress={() => setActiveTab('vehicles')}
                    >
                        <MaterialCommunityIcons
                            name="car"
                            size={24}
                            color={activeTab === 'vehicles' ? '#075E54' : '#666'}
                        />
                        <Text style={[styles.tabText, activeTab === 'vehicles' && styles.activeTabText]}>
                            Vehicles
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tabButton, activeTab === 'bookings' && styles.activeTabButton]}
                        onPress={() => setActiveTab('bookings')}
                    >
                        <MaterialIcons
                            name="bookmarks"
                            size={24}
                            color={activeTab === 'bookings' ? '#075E54' : '#666'}
                        />
                        <Text style={[styles.tabText, activeTab === 'bookings' && styles.activeTabText]}>
                            Bookings ({bookings.length})
                        </Text>
                    </TouchableOpacity>
                </View>

                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#00d285" />
                        <Text style={styles.loadingText}>Loading bookings...</Text>
                    </View>
                ) : bookings.length === 0 ? (
                    <View style={styles.emptyStateContainer}>
                        <View style={styles.emptyIconCircle}>
                            <MaterialCommunityIcons name="calendar-blank" size={40} color="#ccc" />
                        </View>
                        <Text style={styles.emptyStateTitle}>No Bookings Found</Text>
                        <Text style={styles.emptyStateText}>
                            Your booking history will appear here
                        </Text>
                    </View>
                ) : (
                    <Animated.View style={[{ opacity: fadeAnim, paddingHorizontal: 16, paddingBottom: 20 }]}>
                        {bookings.map((booking, index) => {
                            // Extract the assignment ID from the first vehicle assignment
                            const assignmentId = booking.vehicle_assignments?.[0]?.id;
                            const uniqueKey = assignmentId ? `assignment-${assignmentId}` : `booking-${booking.id}`;

                            return (
                                <BookingCard
                                    key={uniqueKey}
                                    booking={booking}
                                    index={index}
                                    onUpdateStatus={updateBookingStatus}
                                    updating={updating}
                                />
                            );
                        })}
                    </Animated.View>
                )}
            </ScrollView>
        </View>
    );
};

export default Bookings;