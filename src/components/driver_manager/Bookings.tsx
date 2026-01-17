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
    Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { styles } from './styles';
import { VehicleImage } from './VehicleImage';
import { Booking, VehicleAssignment, Driver } from './types';
import { BACKEND_URL } from '../../config/config';
import { getStatusColor, getStatusIconBooking } from './utils';
import BookingModal from './bookingModal';

const BackIcon = () => (
    <View style={styles.backIcon}>
        <View style={styles.backArrow} />
        <Text style={styles.backText}>Back</Text>
    </View>
);

interface BookingsProps {
    token: string | null;
    city: string;
    onBack: () => void;
    setActiveTab: (tab: 'vehicles' | 'bookings') => void;
    activeTab: 'vehicles' | 'bookings';
    setLoading: (loading: boolean) => void;
    loading: boolean;
}

type ExtendedBooking = Booking & {
    vehicle_assignments?: VehicleAssignment[];
};

interface OdometerModalState {
    visible: boolean;
    type: 'start' | 'end';
    bookingId: number | null;
    selectedStatus: string;
    cancellationReason?: string;
    assignments: VehicleAssignment[];
}

const BookingCard: React.FC<{
    booking: ExtendedBooking;
    index: number;
    onUpdateStatus: (bookingId: number, status: string, reason?: string) => void;
    onOpenDriverModal: (assignment: VehicleAssignment) => void;
    updating: boolean;
}> = ({ booking, index, onUpdateStatus, onOpenDriverModal, updating }) => {
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

    // Check if we need odometer readings
    if ((selectedStatus === 'in-progress' || selectedStatus === 'completed') && assignments.length === 0) {
        Alert.alert('Error', 'No vehicles assigned to this booking');
        return;
    }

    setIsUpdating(true);
    await onUpdateStatus(booking.id, selectedStatus, cancellationReason);
    setIsUpdating(false);
    setShowCancellationInput(false);
    setCancellationReason('');
};

    const assignments = booking.vehicle_assignments || [];
    const hasMultipleVehicles = assignments.length > 1;
    const firstVehicle = assignments.length > 0 ? assignments[0].vehicle : null;

    return (
        <Animated.View style={[styles.bookingCard, { transform: [{ translateY: slideAnim }] }]}>
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

            {/* Vehicle Assignments Section */}
            {assignments.length > 0 && (
                <View style={styles.assignmentsSection}>
                    <Text style={styles.assignmentsSectionTitle}>Assigned Vehicles & Drivers</Text>
                    {assignments.map((assignment) => (
                        <View key={assignment.id} style={styles.assignmentCard}>
                            <View style={styles.assignmentRow}>
                                <MaterialCommunityIcons name="car" size={18} color="#008069" />
                                <Text style={styles.assignmentVehicleText}>
                                    {assignment.vehicle.make} {assignment.vehicle.model} ({assignment.vehicle.license_plate})
                                </Text>
                            </View>
                            <View style={styles.driverRow}>
                                <MaterialCommunityIcons
                                    name="account-circle"
                                    size={18}
                                    color={assignment.assigned_driver ? "#00d285" : "#999"}
                                />
                                <Text style={[
                                    styles.driverText,
                                    !assignment.assigned_driver && styles.noDriverText
                                ]}>
                                    {assignment.assigned_driver
                                        ? assignment.assigned_driver.full_name
                                        : 'No driver assigned'}
                                </Text>
                                <TouchableOpacity
                                    style={styles.changeDriverButton}
                                    onPress={() => onOpenDriverModal(assignment)}
                                >
                                    <MaterialCommunityIcons name="pencil" size={16} color="#008069" />
                                    <Text style={styles.changeDriverText}>
                                        {assignment.assigned_driver ? 'Change' : 'Assign'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))}
                </View>
            )}

            {/* Odometer Readings - Show for completed bookings */}
            {booking.status === 'completed' && assignments.length > 0 && (
                <View style={styles.odometerSection}>
                    <Text style={styles.odometerSectionTitle}>Odometer Readings</Text>
                    {assignments.map((assignment) => (
                        <View key={`odometer-${assignment.id}`} style={styles.odometerCard}>
                            <Text style={styles.odometerVehicleText}>
                                {assignment.vehicle.license_plate}
                            </Text>
                            <View style={styles.odometerReadings}>
                                <View style={styles.odometerReading}>
                                    <MaterialCommunityIcons name="speedometer" size={16} color="#008069" />
                                    <Text style={styles.odometerLabel}>Start:</Text>
                                    <Text style={styles.odometerValue}>
                                        {assignment.odometer_start_reading || 'N/A'}
                                    </Text>
                                </View>
                                <View style={styles.odometerReading}>
                                    <MaterialCommunityIcons name="speedometer" size={16} color="#FF3B30" />
                                    <Text style={styles.odometerLabel}>End:</Text>
                                    <Text style={styles.odometerValue}>
                                        {assignment.odometer_end_reading || 'N/A'}
                                    </Text>
                                </View>
                                {assignment.odometer_start_reading && assignment.odometer_end_reading && (
                                    <View style={styles.odometerReading}>
                                        <MaterialCommunityIcons name="map-marker-distance" size={16} color="#666" />
                                        <Text style={styles.odometerLabel}>Distance:</Text>
                                        <Text style={styles.odometerValue}>
                                            {(parseInt(assignment.odometer_end_reading) - parseInt(assignment.odometer_start_reading)).toLocaleString()} km
                                        </Text>
                                    </View>
                                )}
                            </View>
                        </View>
                    ))}
                </View>
            )}

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

            {/* End Date & Time Section */}
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

            <View style={{ marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#f0f0f0' }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 12 }}>
                    Update Status
                </Text>
                <View style={styles.statusOptions}>
                    {['assigned', 'in-progress', 'completed', 'cancelled'].map((status) => {
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
    city,
    onBack,
    setActiveTab,
    activeTab,
    setLoading,
    loading,
}) => {
    const [bookings, setBookings] = useState<ExtendedBooking[]>([]);
    const [updating, setUpdating] = useState(false);
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const [isBookingModalVisible, setIsBookingModalVisible] = useState(false);

    // Driver assignment state
    const [selectedAssignment, setSelectedAssignment] = useState<VehicleAssignment | null>(null);
    const [isDriverModalVisible, setIsDriverModalVisible] = useState(false);
    const [availableDrivers, setAvailableDrivers] = useState<Driver[]>([]);
    const [selectedDriverId, setSelectedDriverId] = useState<string>('');
    const [loadingDrivers, setLoadingDrivers] = useState(false);

    // Odometer modal state
    const [odometerModal, setOdometerModal] = useState<OdometerModalState>({
        visible: false,
        type: 'start',
        bookingId: null,
        selectedStatus: '',
        cancellationReason: undefined,
        assignments: [],
    });
    const [odometerReadings, setOdometerReadings] = useState<{ [key: number]: string }>({});
    const [submittingOdometer, setSubmittingOdometer] = useState(false);
    useEffect(() => {
        if (token) {
            fetchBookings();
        }
    }, [token, city]);

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
        const response = await fetch(`${BACKEND_URL}/manager/getCarBookings`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ token }),
        });

        const text = await response.text();
        console.log('Raw response:', text.substring(0, 500)); // Log first 500 chars

        if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
            try {
                const data = JSON.parse(text);
                console.log('Parsed data:', JSON.stringify(data, null, 2).substring(0, 1000));
                
                if (response.ok) {
                    const bookingsData = data.bookings || [];
                    if (Array.isArray(bookingsData)) {
                        // Log first booking to check structure
                        if (bookingsData.length > 0) {
                            console.log('First booking structure:', JSON.stringify(bookingsData[0], null, 2));
                            console.log('Vehicle assignments:', bookingsData[0].vehicle_assignments);
                        }
                        
                        const sortedBookings = [...bookingsData].sort((a: ExtendedBooking, b: ExtendedBooking) =>
                            new Date(b.created_at || b.start_time || 0).getTime() - new Date(a.created_at || a.start_time || 0).getTime()
                        );
                        setBookings(sortedBookings);
                    } else {
                        console.error('Bookings data is not an array:', bookingsData);
                        setBookings([]);
                    }
                } else {
                    console.error('Response not OK:', data);
                    setBookings([]);
                }
            } catch (parseError) {
                console.error('Failed to parse bookings JSON:', parseError);
                setBookings([]);
            }
        } else {
            console.error('Response is not JSON:', text);
            setBookings([]);
        }
    } catch (error) {
        console.error('Error fetching bookings:', error);
        setBookings([]);
    } finally {
        setLoading(false);
    }
};

    const fetchAvailableDrivers = async () => {
        setLoadingDrivers(true);
        try {
            const response = await fetch(`${BACKEND_URL}/manager/getDrivers`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ token }),
            });

            const text = await response.text();
            if (text.trim().startsWith('{')) {
                try {
                    const data = JSON.parse(text);
                    if (response.ok && data.drivers) {
                        setAvailableDrivers(data.drivers);
                    } else {
                        Alert.alert('Error', data.message || 'Failed to fetch drivers');
                    }
                } catch (parseError) {
                    console.error('Failed to parse drivers response:', parseError);
                    Alert.alert('Error', 'Invalid response from server');
                }
            } else {
                Alert.alert('Error', 'Invalid response from server');
            }
        } catch (error) {
            console.error('Error fetching drivers:', error);
            Alert.alert('Error', 'Network error occurred');
        } finally {
            setLoadingDrivers(false);
        }
    };

    const updateBookingStatus = async (bookingId: number, status: string, reason?: string) => {
        // Check if odometer reading is required
        if (status === 'in-progress' || status === 'completed') {
            const booking = bookings.find(b => b.id === bookingId);
            const assignments = booking?.vehicle_assignments || [];

            setOdometerModal({
                visible: true,
                type: status === 'in-progress' ? 'start' : 'end',
                bookingId,
                selectedStatus: status,
                cancellationReason: reason,
                assignments: assignments,
            });
            setOdometerReadings({});  // Reset readings
            setUpdating(false);
            return;
        }

        // Proceed with status update for other statuses
        await performStatusUpdate(bookingId, status, reason);
    };

    const performStatusUpdate = async (bookingId: number, status: string, reason?: string, readings?: { [key: number]: string }) => {
        setUpdating(true);
        setSubmittingOdometer(true);
        try {
            const requestBody: any = {
                token,
                booking_id: bookingId,
                status: status,
            };
            if (status === 'cancelled' && reason) {
                requestBody.reason_of_cancellation = reason;
            }
            if (status === 'in-progress' && readings) {
                requestBody.odometer_readings = Object.entries(readings).map(([assignmentId, reading]) => ({
                    assignment_id: parseInt(assignmentId),
                    odometer_start_reading: reading
                }));
            }
            if (status === 'completed' && readings) {
                requestBody.odometer_readings = Object.entries(readings).map(([assignmentId, reading]) => ({
                    assignment_id: parseInt(assignmentId),
                    odometer_end_reading: reading
                }));
            }

            const response = await fetch(`${BACKEND_URL}/manager/updateCarBookings`, {
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
            setSubmittingOdometer(false);
            setOdometerModal({
                visible: false,
                type: 'start',
                bookingId: null,
                selectedStatus: '',
                cancellationReason: undefined,
                assignments: [],
            });
            setOdometerReadings({});
        }
    };

    const handleOdometerConfirm = async () => {
        // Check if all assignments have readings
        const missingReadings = odometerModal.assignments.filter(
            assignment => !odometerReadings[assignment.id]?.trim()
        );

        if (missingReadings.length > 0) {
            Alert.alert('Error', `Please enter odometer readings for all ${odometerModal.assignments.length} vehicle(s)`);
            return;
        }

        // Validate that readings are numeric
        const invalidReadings = Object.entries(odometerReadings).filter(
            ([_, value]) => isNaN(Number(value)) || Number(value) <= 0
        );

        if (invalidReadings.length > 0) {
            Alert.alert('Error', 'Please enter valid numeric odometer readings greater than 0');
            return;
        }

        if (odometerModal.bookingId) {
            await performStatusUpdate(
                odometerModal.bookingId,
                odometerModal.selectedStatus,
                odometerModal.cancellationReason,
                odometerReadings
            );
        }
    };

    const updateDriverAssignment = async () => {
        if (!selectedAssignment || !selectedDriverId) {
            Alert.alert('Error', 'Please select a driver');
            return;
        }

        try {
            const response = await fetch(`${BACKEND_URL}/manager/updateDriverInBooking`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    token,
                    assignment_id: selectedAssignment.id,
                    driver_id: selectedDriverId,
                }),
            });

            const text = await response.text();
            if (text.trim().startsWith('{')) {
                try {
                    const data = JSON.parse(text);
                    if (response.ok) {
                        Alert.alert('Success', 'Driver updated successfully!');
                        setIsDriverModalVisible(false);
                        setSelectedAssignment(null);
                        setSelectedDriverId('');
                        fetchBookings();
                    } else {
                        Alert.alert('Error', data.message || 'Failed to update driver');
                    }
                } catch (parseError) {
                    console.error('Failed to parse update driver response:', parseError);
                    Alert.alert('Error', 'Invalid response from server');
                }
            } else {
                Alert.alert('Error', 'Invalid response from server');
            }
        } catch (error) {
            console.error('Error updating driver:', error);
            Alert.alert('Error', 'Network error occurred');
        }
    };

    const handleOpenDriverModal = async (assignment: VehicleAssignment) => {
        setSelectedAssignment(assignment);
        setSelectedDriverId(assignment.assigned_driver?.employee_id || '');
        await fetchAvailableDrivers();
        setIsDriverModalVisible(true);
    };

    const handleCreateBooking = () => {
        setIsBookingModalVisible(true);
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
                        colors={['#075E54', '#128C7E']}
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
                                    <Text style={styles.headerSubtitle}>Managing: {city}</Text>
                                </View>
                                <TouchableOpacity
                                    style={{ padding: 8 }}
                                    onPress={handleCreateBooking}
                                >
                                    <MaterialIcons name="add" size={24} color="#fff" />
                                </TouchableOpacity>
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

                <View style={[styles.tabContainer, { backgroundColor: '#ffffffff', padding: 0 }]}>
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
                            No bookings found for {city}
                        </Text>
                        <TouchableOpacity
                            style={styles.searchBtn}
                            onPress={handleCreateBooking}
                        >
                            <Text style={styles.searchBtnText}>Create First Booking</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <Animated.View style={{ opacity: fadeAnim }}>
                        <View style={{ paddingHorizontal: 16, paddingBottom: 20 }}>
                            {bookings.map((booking, index) => {
                                return (
                                    <BookingCard
                                        key={`booking-${booking.id}`}
                                        booking={booking}
                                        index={index}
                                        onUpdateStatus={updateBookingStatus}
                                        onOpenDriverModal={handleOpenDriverModal}
                                        updating={updating}
                                    />
                                );
                            })}
                        </View>
                    </Animated.View>
                )}
            </ScrollView>

            <BookingModal
                visible={isBookingModalVisible}
                onClose={() => setIsBookingModalVisible(false)}
                token={token}
                city={city}
                onBookingCreated={() => {
                    setIsBookingModalVisible(false);
                    fetchBookings();
                }}
            />

            {/* Driver Selection Modal */}
            <Modal
                visible={isDriverModalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setIsDriverModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select Driver</Text>
                            <TouchableOpacity onPress={() => setIsDriverModalVisible(false)}>
                                <MaterialCommunityIcons name="close" size={24} color="#333" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.driverList}>
                            {loadingDrivers ? (
                                <ActivityIndicator size="large" color="#008069" style={{ marginTop: 20 }} />
                            ) : availableDrivers.length === 0 ? (
                                <Text style={styles.noDriversText}>No drivers available</Text>
                            ) : (
                                availableDrivers.map((driver) => (
                                    <TouchableOpacity
                                        key={driver.employee_id}
                                        style={[
                                            styles.driverOption,
                                            selectedDriverId === driver.employee_id && styles.selectedDriverOption
                                        ]}
                                        onPress={() => setSelectedDriverId(driver.employee_id)}
                                    >
                                        <View style={styles.driverOptionContent}>
                                            {driver.profile_picture ? (
                                                <Image
                                                    source={{ uri: driver.profile_picture }}
                                                    style={styles.driverAvatar}
                                                />
                                            ) : (
                                                <View style={styles.driverAvatarPlaceholder}>
                                                    <MaterialCommunityIcons name="account" size={24} color="#999" />
                                                </View>
                                            )}
                                            <View style={styles.driverInfo}>
                                                <Text style={styles.driverName}>{driver.full_name}</Text>
                                            </View>
                                        </View>
                                        {selectedDriverId === driver.employee_id && (
                                            <MaterialCommunityIcons name="check-circle" size={24} color="#008069" />
                                        )}
                                    </TouchableOpacity>
                                ))
                            )}
                        </ScrollView>

                        <View style={styles.modalFooter}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={() => setIsDriverModalVisible(false)}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.confirmButton, !selectedDriverId && styles.disabledButton]}
                                onPress={updateDriverAssignment}
                                disabled={!selectedDriverId}
                            >
                                <Text style={styles.confirmButtonText}>Confirm</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Odometer Reading Modal */}
            {/* Odometer Reading Modal */}
            <Modal
                visible={odometerModal.visible}
                transparent
                animationType="slide"
                onRequestClose={() => {
                    if (!submittingOdometer) {
                        setOdometerModal({
                            visible: false,
                            type: 'start',
                            bookingId: null,
                            selectedStatus: '',
                            cancellationReason: undefined,
                            assignments: [],
                        });
                        setOdometerReadings({});
                    }
                }}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.odometerModalContainer}>
                        <View style={styles.modalHeader}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.modalTitle}>
                                    {odometerModal.type === 'start' ? 'Start Trip' : 'Complete Trip'}
                                </Text>
                                <Text style={styles.modalSubtitle}>
                                    Enter odometer {odometerModal.type === 'start' ? 'start' : 'end'} readings
                                </Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => {
                                    if (!submittingOdometer) {
                                        setOdometerModal({
                                            visible: false,
                                            type: 'start',
                                            bookingId: null,
                                            selectedStatus: '',
                                            cancellationReason: undefined,
                                            assignments: [],
                                        });
                                        setOdometerReadings({});
                                    }
                                }}
                                disabled={submittingOdometer}
                            >
                                <MaterialCommunityIcons name="close" size={24} color="#FFFFFF" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView
                            style={{ flex: 1, maxHeight: 500 }}
                            contentContainerStyle={{ padding: 20 }}
                            showsVerticalScrollIndicator={false}
                        >
                            <View style={{ alignItems: 'center', marginBottom: 24 }}>
                                <View style={{
                                    width: 80,
                                    height: 80,
                                    borderRadius: 40,
                                    backgroundColor: '#E8F5E9',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginBottom: 16
                                }}>
                                    <MaterialCommunityIcons
                                        name="speedometer"
                                        size={40}
                                        color="#008069"
                                    />
                                </View>
                                <Text style={{
                                    fontSize: 16,
                                    color: '#666',
                                    textAlign: 'center',
                                    lineHeight: 22
                                }}>
                                    Please record the odometer reading for {odometerModal.assignments.length === 1 ? 'this vehicle' : 'each vehicle'} before {odometerModal.type === 'start' ? 'starting' : 'completing'} the trip
                                </Text>
                            </View>

                            {odometerModal.assignments.map((assignment, index) => (
                                <View
                                    key={assignment.id}
                                    style={{
                                        backgroundColor: '#F8F9FA',
                                        borderRadius: 16,
                                        padding: 16,
                                        marginBottom: 16,
                                        borderLeftWidth: 4,
                                        borderLeftColor: '#008069',
                                        shadowColor: '#000',
                                        shadowOffset: { width: 0, height: 2 },
                                        shadowOpacity: 0.05,
                                        shadowRadius: 4,
                                        elevation: 2
                                    }}
                                >
                                    <View style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        marginBottom: 16
                                    }}>
                                        <View style={{
                                            width: 40,
                                            height: 40,
                                            borderRadius: 20,
                                            backgroundColor: '#008069',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            marginRight: 12
                                        }}>
                                            <Text style={{
                                                color: '#FFFFFF',
                                                fontSize: 16,
                                                fontWeight: '700'
                                            }}>
                                                {index + 1}
                                            </Text>
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={{
                                                fontSize: 16,
                                                fontWeight: '700',
                                                color: '#1A1A1A',
                                                marginBottom: 2
                                            }}>
                                                {assignment.vehicle.make} {assignment.vehicle.model}
                                            </Text>
                                            <Text style={{
                                                fontSize: 14,
                                                color: '#666',
                                                fontWeight: '600'
                                            }}>
                                                {assignment.vehicle.license_plate}
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={{
                                        backgroundColor: '#FFFFFF',
                                        borderRadius: 12,
                                        borderWidth: 2,
                                        borderColor: odometerReadings[assignment.id] ? '#008069' : '#E9EDEF',
                                        overflow: 'hidden'
                                    }}>
                                        <View style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            paddingHorizontal: 16
                                        }}>
                                            <MaterialCommunityIcons
                                                name="speedometer"
                                                size={20}
                                                color={odometerReadings[assignment.id] ? '#008069' : '#999'}
                                            />
                                            <TextInput
                                                style={{
                                                    flex: 1,
                                                    paddingVertical: 16,
                                                    paddingHorizontal: 12,
                                                    fontSize: 18,
                                                    fontWeight: '600',
                                                    color: '#1A1A1A'
                                                }}
                                                value={odometerReadings[assignment.id] || ''}
                                                onChangeText={(value) => {
                                                    // Only allow numeric input
                                                    const numericValue = value.replace(/[^0-9]/g, '');
                                                    setOdometerReadings(prev => ({
                                                        ...prev,
                                                        [assignment.id]: numericValue
                                                    }));
                                                }}
                                                placeholder="Enter reading"
                                                placeholderTextColor="#999"
                                                keyboardType="numeric"
                                                autoFocus={index === 0}
                                                editable={!submittingOdometer}
                                            />
                                            <Text style={{
                                                fontSize: 14,
                                                color: '#666',
                                                fontWeight: '500'
                                            }}>
                                                km
                                            </Text>
                                        </View>
                                    </View>

                                    {odometerReadings[assignment.id] && (
                                        <View style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            marginTop: 12,
                                            backgroundColor: '#E8F5E9',
                                            padding: 8,
                                            borderRadius: 8
                                        }}>
                                            <MaterialCommunityIcons
                                                name="check-circle"
                                                size={16}
                                                color="#008069"
                                            />
                                            <Text style={{
                                                fontSize: 12,
                                                color: '#008069',
                                                fontWeight: '600',
                                                marginLeft: 6
                                            }}>
                                                Reading recorded: {Number(odometerReadings[assignment.id]).toLocaleString()} km
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            ))}
                        </ScrollView>

                        <View style={styles.modalFooter}>
                            <TouchableOpacity
                                style={[
                                    styles.modalButton,
                                    styles.cancelButton,
                                    submittingOdometer && { opacity: 0.5 }
                                ]}
                                onPress={() => {
                                    if (!submittingOdometer) {
                                        setOdometerModal({
                                            visible: false,
                                            type: 'start',
                                            bookingId: null,
                                            selectedStatus: '',
                                            cancellationReason: undefined,
                                            assignments: [],
                                        });
                                        setOdometerReadings({});
                                    }
                                }}
                                disabled={submittingOdometer}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.modalButton,
                                    styles.confirmButton,
                                    (Object.keys(odometerReadings).length !== odometerModal.assignments.length || submittingOdometer) && styles.disabledButton
                                ]}
                                onPress={handleOdometerConfirm}
                                disabled={Object.keys(odometerReadings).length !== odometerModal.assignments.length || submittingOdometer}
                            >
                                {submittingOdometer ? (
                                    <ActivityIndicator color="#FFFFFF" size="small" />
                                ) : (
                                    <>
                                        <MaterialCommunityIcons name="check-circle" size={20} color="#FFFFFF" />
                                        <Text style={styles.confirmButtonText}>
                                            Confirm {odometerModal.type === 'start' ? 'Start' : 'Complete'}
                                        </Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

export default Bookings;