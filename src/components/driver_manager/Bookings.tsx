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

// ─── Status helpers ──────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
    pending:       'Pending',
    assigned:      'Assigned',
    accepted:      'Accepted',
    'in-progress': 'Started',
    completed:     'Ended',
    cancelled:     'Cancelled',
};

const getDisplayStatus = (s: string) => STATUS_LABELS[s.toLowerCase()] ?? s;

/** Which states the manager can move a booking TO (ordered for display) */
const MANAGER_NEXT_STATES: Record<string, string[]> = {
    pending:       ['assigned', 'cancelled'],
    assigned:      ['in-progress', 'cancelled'],   // manager can skip accepted
    accepted:      ['in-progress', 'cancelled'],
    'in-progress': ['completed', 'cancelled'],
    completed:     [],
    cancelled:     [],
};

const BackIcon = () => (
    <View style={styles.backIcon}>
        <View style={styles.backArrow} />
        <Text style={styles.backText}>Back</Text>
    </View>
);

// ─── Types ───────────────────────────────────────────────────────────────────

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

// ─── BookingCard ─────────────────────────────────────────────────────────────

const BookingCard: React.FC<{
    booking: ExtendedBooking;
    index: number;
    onUpdateStatus: (bookingId: number, status: string, reason?: string) => void;
    onOpenDriverModal: (assignment: VehicleAssignment) => void;
    updating: boolean;
}> = ({ booking, index, onUpdateStatus, onOpenDriverModal, updating }) => {
    const slideAnim = useRef(new Animated.Value(30)).current;

    const currentStatus = booking.status.toLowerCase();
    const nextStates    = MANAGER_NEXT_STATES[currentStatus] ?? [];
    const isTerminal    = nextStates.length === 0;

    const [selectedStatus,     setSelectedStatus]     = useState('');
    const [cancellationReason, setCancellationReason] = useState('');
    const [isUpdating,         setIsUpdating]         = useState(false);

    useEffect(() => {
        Animated.timing(slideAnim, {
            toValue: 0, duration: 400, delay: index * 100, useNativeDriver: true,
        }).start();
    }, []);

    const handleSelectStatus = (s: string) => {
        setSelectedStatus(prev => prev === s ? '' : s);
        setCancellationReason('');
    };

    const handleUpdate = async () => {
        if (!selectedStatus) return;
        if (selectedStatus === 'cancelled' && !cancellationReason.trim()) {
            Alert.alert('Required', 'Please enter a cancellation reason.');
            return;
        }
        setIsUpdating(true);
        await onUpdateStatus(booking.id, selectedStatus, cancellationReason || undefined);
        setIsUpdating(false);
        setSelectedStatus('');
        setCancellationReason('');
    };

    const assignments  = booking.vehicle_assignments ?? [];
    const firstVehicle = assignments[0]?.vehicle ?? null;
    const statusColor  = getStatusColor(booking.status);

    return (
        <Animated.View style={[styles.bookingCard, { transform: [{ translateY: slideAnim }] }]}>

            {/* ── Header ───────────────────────────────────────────────── */}
            <View style={styles.bookingCardHeader}>
                <View style={styles.vehicleInfo}>
                    {booking.vehicle && <VehicleImage vehicle={booking.vehicle} size="small" />}
                    <View style={{ marginLeft: 12, flex: 1 }}>
                        <Text style={styles.vehicleName}>
                            {assignments.length > 1
                                ? `${assignments.length} Vehicles`
                                : firstVehicle
                                ? `${firstVehicle.make} ${firstVehicle.model}`
                                : booking.vehicle
                                ? `${booking.vehicle.make} ${booking.vehicle.model}`
                                : 'Vehicle'}
                        </Text>
                        <Text style={styles.plateText}>
                            {booking.vehicle_assignments?.[0]?.vehicle.license_plate ?? 'N/A'}
                        </Text>
                    </View>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
                    <MaterialCommunityIcons
                        name={getStatusIconBooking(booking.status)}
                        size={14}
                        color={statusColor}
                    />
                    <Text style={[styles.statusText, { color: statusColor }]}>
                        {getDisplayStatus(booking.status)}
                    </Text>
                </View>
            </View>

            {/* ── Accepted info banner ─────────────────────────────────── */}
            {currentStatus === 'accepted' && (
                <View style={{
                    marginBottom: 8,
                    backgroundColor: '#E8F5E9',
                    borderRadius: 8,
                    padding: 10,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                }}>
                    <MaterialCommunityIcons name="check-decagram" size={18} color="#2E7D32" />
                    <Text style={{ color: '#2E7D32', fontSize: 13, fontWeight: '600', flex: 1 }}>
                        Driver has accepted this booking and is preparing to start.
                    </Text>
                </View>
            )}

            {/* ── Vehicle assignments ──────────────────────────────────── */}
            {assignments.length > 0 && (
                <View style={styles.assignmentsSection}>
                    <Text style={styles.assignmentsSectionTitle}>Assigned Vehicles & Drivers</Text>
                    {assignments.map(assignment => (
                        <View key={assignment.id} style={styles.assignmentCard}>
                            <View style={styles.assignmentRow}>
                                <MaterialCommunityIcons name="car" size={18} color="#008069" />
                                <Text style={styles.assignmentVehicleText}>
                                    {assignment.vehicle.make} {assignment.vehicle.model}{' '}
                                    ({assignment.vehicle.license_plate})
                                </Text>
                            </View>
                            {/* ── per-assignment status badge ── */}
                            <View style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                marginTop: 4,
                                marginBottom: 4,
                                gap: 6,
                            }}>
                                <View style={[
                                    styles.statusBadge,
                                    {
                                        backgroundColor: `${getStatusColor(assignment.assignment_status)}18`,
                                        paddingHorizontal: 8,
                                        paddingVertical: 3,
                                        borderRadius: 6,
                                    },
                                ]}>
                                    <MaterialCommunityIcons
                                        name={getStatusIconBooking(assignment.assignment_status)}
                                        size={12}
                                        color={getStatusColor(assignment.assignment_status)}
                                    />
                                    <Text style={{
                                        fontSize: 11,
                                        fontWeight: '600',
                                        color: getStatusColor(assignment.assignment_status),
                                        marginLeft: 4,
                                    }}>
                                        {getDisplayStatus(assignment.assignment_status)}
                                    </Text>
                                </View>
                            </View>
                            <View style={styles.driverRow}>
                                <MaterialCommunityIcons
                                    name="account-circle"
                                    size={18}
                                    color={assignment.assigned_driver ? '#00d285' : '#999'}
                                />
                                <Text style={[
                                    styles.driverText,
                                    !assignment.assigned_driver && styles.noDriverText,
                                ]}>
                                    {assignment.assigned_driver?.full_name ?? 'No driver assigned'}
                                </Text>
                                <TouchableOpacity
                                    style={[
                                        styles.changeDriverButton,
                                        (currentStatus === 'completed' || currentStatus === 'cancelled') && {
                                            opacity: 0.5,
                                            backgroundColor: '#f0f0f0',
                                        },
                                    ]}
                                    onPress={() => onOpenDriverModal(assignment)}
                                    disabled={currentStatus === 'completed' || currentStatus === 'cancelled'}
                                >
                                    <MaterialCommunityIcons
                                        name="pencil"
                                        size={16}
                                        color={(currentStatus === 'completed' || currentStatus === 'cancelled') ? '#999' : '#008069'}
                                    />
                                    <Text style={[
                                        styles.changeDriverText,
                                        (currentStatus === 'completed' || currentStatus === 'cancelled') && { color: '#999' },
                                    ]}>
                                        {assignment.assigned_driver ? 'Change' : 'Assign'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))}
                </View>
            )}

            {/* ── Odometer summary (completed) ─────────────────────────── */}
            {currentStatus === 'completed' && assignments.length > 0 && (
                <View style={styles.odometerSection}>
                    <Text style={styles.odometerSectionTitle}>Odometer Readings</Text>
                    {assignments.map(a => {
                        const dist = (a.odometer_start_reading && a.odometer_end_reading)
                            ? parseInt(a.odometer_end_reading) - parseInt(a.odometer_start_reading)
                            : null;
                        return (
                            <View key={`odometer-${a.id}`} style={styles.odometerCard}>
                                <Text style={styles.odometerVehicleText}>{a.vehicle.license_plate}</Text>
                                <View style={styles.odometerReadings}>
                                    <View style={styles.odometerReading}>
                                        <MaterialCommunityIcons name="speedometer" size={16} color="#008069" />
                                        <Text style={styles.odometerLabel}>Start:</Text>
                                        <Text style={styles.odometerValue}>{a.odometer_start_reading ?? 'N/A'}</Text>
                                    </View>
                                    <View style={styles.odometerReading}>
                                        <MaterialCommunityIcons name="speedometer" size={16} color="#FF3B30" />
                                        <Text style={styles.odometerLabel}>End:</Text>
                                        <Text style={styles.odometerValue}>{a.odometer_end_reading ?? 'N/A'}</Text>
                                    </View>
                                    {dist !== null && (
                                        <View style={styles.odometerReading}>
                                            <MaterialCommunityIcons name="map-marker-distance" size={16} color="#666" />
                                            <Text style={styles.odometerLabel}>Distance:</Text>
                                            <Text style={styles.odometerValue}>
                                                {dist.toLocaleString()} km
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            </View>
                        );
                    })}
                </View>
            )}

            {/* ── Body ─────────────────────────────────────────────────── */}
            <View style={styles.bookingCardBody}>
                <View style={styles.locationRow}>
                    <MaterialCommunityIcons name="account" size={16} color="#666" />
                    <Text style={styles.locationText}>{booking.booked_for?.full_name ?? 'Unknown'}</Text>
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

            {/* ── Time footer ──────────────────────────────────────────── */}
            <View style={styles.bookingCardFooter}>
                <View style={{ marginRight: 6 }}>
                    <Text style={{ fontSize: 12, color: '#888', fontWeight: '500' }}>Start:</Text>
                </View>
                <View style={styles.dateTimeInfo}>
                    <MaterialCommunityIcons name="calendar" size={16} color="#666" />
                    <Text style={styles.dateTimeInfoText}>
                        {new Date(booking.start_time).toLocaleDateString('en-US', {
                            month: 'short', day: 'numeric', year: 'numeric',
                        })}
                    </Text>
                </View>
                <View style={styles.dateTimeInfo}>
                    <MaterialCommunityIcons name="clock-outline" size={16} color="#666" />
                    <Text style={styles.dateTimeInfoText}>
                        {new Date(booking.start_time).toLocaleTimeString('en-US', {
                            hour: '2-digit', minute: '2-digit',
                        })}
                    </Text>
                </View>
            </View>
            {booking.end_time && (
                <View style={[styles.bookingCardFooter, { paddingTop: 8, borderTopWidth: 0 }]}>
                    <View style={{ marginRight: 6 }}>
                        <Text style={{ fontSize: 12, color: '#888', fontWeight: '500' }}>End:</Text>
                    </View>
                    <View style={styles.dateTimeInfo}>
                        <MaterialCommunityIcons name="calendar" size={16} color="#666" />
                        <Text style={styles.dateTimeInfoText}>
                            {new Date(booking.end_time).toLocaleDateString('en-US', {
                                month: 'short', day: 'numeric', year: 'numeric',
                            })}
                        </Text>
                    </View>
                    <View style={styles.dateTimeInfo}>
                        <MaterialCommunityIcons name="clock-outline" size={16} color="#666" />
                        <Text style={styles.dateTimeInfoText}>
                            {new Date(booking.end_time).toLocaleTimeString('en-US', {
                                hour: '2-digit', minute: '2-digit',
                            })}
                        </Text>
                    </View>
                </View>
            )}

            {/* ── Status update (manager) ───────────────────────────────── */}
            {!isTerminal && (
                <View style={{
                    marginTop: 16,
                    paddingTop: 16,
                    borderTopWidth: 1,
                    borderTopColor: '#f0f0f0',
                }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 12 }}>
                        Update Status
                    </Text>
                    <View style={styles.statusOptions}>
                        {nextStates.map(s => {
                            const color      = getStatusColor(s);
                            const isSelected = selectedStatus === s;
                            return (
                                <TouchableOpacity
                                    key={s}
                                    style={[
                                        styles.statusOption,
                                        isSelected && { backgroundColor: color, borderColor: color },
                                    ]}
                                    onPress={() => handleSelectStatus(s)}
                                >
                                    <MaterialCommunityIcons
                                        name={getStatusIconBooking(s)}
                                        size={16}
                                        color={isSelected ? '#FFF' : color}
                                    />
                                    <Text style={[
                                        styles.statusOptionText,
                                        { color: isSelected ? '#FFF' : color },
                                    ]}>
                                        {getDisplayStatus(s).toUpperCase()}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    {selectedStatus === 'cancelled' && (
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

                    {selectedStatus && (
                        <TouchableOpacity
                            style={[
                                styles.updateButton,
                                { marginTop: 12 },
                                (isUpdating || updating) && { backgroundColor: '#ccc' },
                            ]}
                            onPress={handleUpdate}
                            disabled={isUpdating || updating}
                        >
                            {isUpdating || updating ? (
                                <ActivityIndicator color="#FFF" size="small" />
                            ) : (
                                <>
                                    <MaterialCommunityIcons name="check-circle" size={20} color="#FFF" />
                                    <Text style={styles.updateButtonText}>
                                        Update to {getDisplayStatus(selectedStatus)}
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>
                    )}
                </View>
            )}

            {isTerminal && (
                <View style={{
                    marginTop: 12,
                    paddingTop: 12,
                    borderTopWidth: 1,
                    borderTopColor: '#f0f0f0',
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                }}>
                    <MaterialCommunityIcons
                        name={currentStatus === 'completed' ? 'check-circle' : 'cancel'}
                        size={16}
                        color={currentStatus === 'completed' ? '#43A047' : '#E53935'}
                    />
                    <Text style={{ fontSize: 12, color: '#888' }}>
                        {currentStatus === 'completed'
                            ? 'This trip has been completed.'
                            : 'This booking has been cancelled.'}
                    </Text>
                </View>
            )}
        </Animated.View>
    );
};

// ─── Bookings screen ─────────────────────────────────────────────────────────

const Bookings: React.FC<BookingsProps> = ({
    token, city, onBack, setActiveTab, activeTab, setLoading, loading,
}) => {
    const [bookings,         setBookings]         = useState<ExtendedBooking[]>([]);
    const [updating,         setUpdating]         = useState(false);
    const fadeAnim                               = useRef(new Animated.Value(0)).current;

    // Driver modal
    const [selectedAssignment,   setSelectedAssignment]   = useState<VehicleAssignment | null>(null);
    const [isDriverModalVisible, setIsDriverModalVisible] = useState(false);
    const [availableDrivers,     setAvailableDrivers]     = useState<Driver[]>([]);
    const [selectedDriverId,     setSelectedDriverId]     = useState('');
    const [loadingDrivers,       setLoadingDrivers]       = useState(false);

    // Odometer modal
    const [odometerModal,     setOdometerModal]     = useState<OdometerModalState>({
        visible: false, type: 'start', bookingId: null, selectedStatus: '',
        cancellationReason: undefined, assignments: [],
    });
    const [odometerReadings,  setOdometerReadings]  = useState<Record<number, string>>({});
    const [submittingOdometer,setSubmittingOdometer]= useState(false);

    useEffect(() => { if (token) fetchBookings(); }, [token, city]);

    useEffect(() => {
        if (!loading && bookings.length > 0) {
            Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
        }
    }, [loading, bookings]);

    const fetchBookings = async () => {
        setLoading(true);
        try {
            const res  = await fetch(`${BACKEND_URL}/manager/getCarBookings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                body: JSON.stringify({ token, city }),
            });
            const text = await res.text();
            if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
                const data = JSON.parse(text);
                if (res.ok) {
                    const sorted = [...(data.bookings ?? [])].sort(
                        (a: ExtendedBooking, b: ExtendedBooking) =>
                            new Date(b.created_at ?? b.start_time ?? 0).getTime() -
                            new Date(a.created_at ?? a.start_time ?? 0).getTime()
                    );
                    setBookings(sorted);
                } else {
                    setBookings([]);
                }
            } else {
                setBookings([]);
            }
        } catch {
            setBookings([]);
        } finally {
            setLoading(false);
        }
    };

    /**
     * For statuses that require odometer readings (in-progress / completed),
     * we open the odometer modal instead of calling the API directly.
     * For all other statuses, we call performStatusUpdate immediately.
     */
    const updateBookingStatus = async (bookingId: number, newStatus: string, reason?: string) => {
        if (newStatus === 'in-progress' || newStatus === 'completed') {
            const booking = bookings.find(b => b.id === bookingId);
            if (!booking) { Alert.alert('Error', 'Booking not found'); return; }
            const asgns = booking.vehicle_assignments ?? [];
            if (asgns.length === 0) { Alert.alert('Error', 'No vehicles assigned to this booking'); return; }

            setOdometerReadings({});
            setTimeout(() => {
                setOdometerModal({
                    visible: true,
                    type: newStatus === 'in-progress' ? 'start' : 'end',
                    bookingId,
                    selectedStatus: newStatus,
                    cancellationReason: reason,
                    assignments: asgns,
                });
            }, 100);
            return;
        }
        await performStatusUpdate(bookingId, newStatus, reason);
    };

    const performStatusUpdate = async (
        bookingId: number,
        newStatus: string,
        reason?: string,
        readings?: Record<number, string>,
    ) => {
        setUpdating(true);
        setSubmittingOdometer(true);
        try {
            const body: Record<string, unknown> = { token, booking_id: bookingId, status: newStatus };
            if (reason) body.reason_of_cancellation = reason;
            if (newStatus === 'in-progress' && readings) {
                body.odometer_readings = Object.entries(readings).map(([id, val]) => ({
                    assignment_id: parseInt(id),
                    odometer_start_reading: val,
                }));
            }
            if (newStatus === 'completed' && readings) {
                body.odometer_readings = Object.entries(readings).map(([id, val]) => ({
                    assignment_id: parseInt(id),
                    odometer_end_reading: val,
                }));
            }

            const res  = await fetch(`${BACKEND_URL}/manager/updateCarBookings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                body: JSON.stringify(body),
            });
            const text = await res.text();
            if (text.trim().startsWith('{')) {
                const data = JSON.parse(text);
                if (res.ok) {
                    Alert.alert('Success', 'Booking status updated successfully!');
                    fetchBookings();
                } else {
                    Alert.alert('Error', data.message ?? 'Failed to update booking status');
                }
            } else {
                Alert.alert('Error', 'Invalid response from server');
            }
        } catch {
            Alert.alert('Error', 'Network error occurred');
        } finally {
            setUpdating(false);
            setSubmittingOdometer(false);
            setOdometerModal({
                visible: false, type: 'start', bookingId: null,
                selectedStatus: '', cancellationReason: undefined, assignments: [],
            });
            setOdometerReadings({});
        }
    };

    const handleOdometerConfirm = async () => {
        const missing = odometerModal.assignments.filter(a => !odometerReadings[a.id]?.trim());
        if (missing.length > 0) {
            Alert.alert('Error', `Please enter odometer readings for all ${odometerModal.assignments.length} vehicle(s)`);
            return;
        }
        const invalid = Object.values(odometerReadings).filter(v => isNaN(Number(v)) || Number(v) <= 0);
        if (invalid.length > 0) {
            Alert.alert('Error', 'Please enter valid numeric odometer readings greater than 0');
            return;
        }
        if (odometerModal.bookingId) {
            await performStatusUpdate(
                odometerModal.bookingId,
                odometerModal.selectedStatus,
                odometerModal.cancellationReason,
                odometerReadings,
            );
        }
    };

    const fetchAvailableDrivers = async () => {
        setLoadingDrivers(true);
        try {
            const res  = await fetch(`${BACKEND_URL}/manager/getDrivers`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                body: JSON.stringify({ token }),
            });
            const text = await res.text();
            if (text.trim().startsWith('{')) {
                const data = JSON.parse(text);
                if (res.ok && data.drivers) setAvailableDrivers(data.drivers);
                else Alert.alert('Error', data.message ?? 'Failed to fetch drivers');
            }
        } catch {
            Alert.alert('Error', 'Network error');
        } finally {
            setLoadingDrivers(false);
        }
    };

    const handleOpenDriverModal = async (assignment: VehicleAssignment) => {
        setSelectedAssignment(assignment);
        setSelectedDriverId(assignment.assigned_driver?.employee_id ?? '');
        await fetchAvailableDrivers();
        setIsDriverModalVisible(true);
    };

    const updateDriverAssignment = async () => {
        if (!selectedAssignment || !selectedDriverId) {
            Alert.alert('Error', 'Please select a driver');
            return;
        }
        try {
            const res  = await fetch(`${BACKEND_URL}/manager/updateDriverInBooking`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                body: JSON.stringify({ token, assignment_id: selectedAssignment.id, driver_id: selectedDriverId }),
            });
            const text = await res.text();
            if (text.trim().startsWith('{')) {
                const data = JSON.parse(text);
                if (res.ok) {
                    Alert.alert('Success', 'Driver updated successfully!');
                    setIsDriverModalVisible(false);
                    setSelectedAssignment(null);
                    setSelectedDriverId('');
                    fetchBookings();
                } else {
                    Alert.alert('Error', data.message ?? 'Failed to update driver');
                }
            }
        } catch {
            Alert.alert('Error', 'Network error');
        }
    };

    const closeOdometerModal = () => {
        if (!submittingOdometer) {
            setOdometerModal({
                visible: false, type: 'start', bookingId: null,
                selectedStatus: '', cancellationReason: undefined, assignments: [],
            });
            setOdometerReadings({});
        }
    };

    const allReadingsEntered =
        odometerModal.assignments.length > 0 &&
        odometerModal.assignments.every(a => odometerReadings[a.id]?.trim());

    return (
        <View style={styles.screenContainer}>
            <ScrollView
                style={styles.scrollContainer}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* ── Header banner ──────────────────────────────────── */}
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
                                <View style={[styles.headerCenter, { marginRight: 60, height: 40 }]}>
                                    <Text style={styles.logoText}>CITADEL</Text>
                                    <Text style={styles.headerSubtitle}>Managing: {city}</Text>
                                </View>
                            </View>
                        </View>
                        <View style={styles.titleSection}>
                            <Text style={styles.sectionTitle}>Manage Bookings</Text>
                            <Text style={styles.sectionSubtitle}>
                                {bookings.length} booking{bookings.length !== 1 ? 's' : ''} found
                            </Text>
                        </View>
                    </LinearGradient>
                </View>

                {/* ── Tab bar ────────────────────────────────────────── */}
                <View style={[styles.tabContainer, { backgroundColor: '#fff', padding: 0 }]}>
                    <TouchableOpacity
                        style={[styles.tabButton, activeTab === 'vehicles' && styles.activeTabButton]}
                        onPress={() => setActiveTab('vehicles')}
                    >
                        <MaterialCommunityIcons
                            name="car" size={24}
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
                            name="bookmarks" size={24}
                            color={activeTab === 'bookings' ? '#075E54' : '#666'}
                        />
                        <Text style={[styles.tabText, activeTab === 'bookings' && styles.activeTabText]}>
                            Bookings ({bookings.length})
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* ── Content ────────────────────────────────────────── */}
                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#00d285" />
                        <Text style={styles.loadingText}>Loading bookings…</Text>
                    </View>
                ) : bookings.length === 0 ? (
                    <View style={styles.emptyStateContainer}>
                        <View style={styles.emptyIconCircle}>
                            <MaterialCommunityIcons name="calendar-blank" size={40} color="#ccc" />
                        </View>
                        <Text style={styles.emptyStateTitle}>No Bookings Found</Text>
                        <Text style={styles.emptyStateText}>No bookings found for {city}</Text>
                    </View>
                ) : (
                    <Animated.View style={{ opacity: fadeAnim }}>
                        <View style={{ paddingHorizontal: 16, paddingBottom: 20 }}>
                            {bookings.map((booking, index) => (
                                <BookingCard
                                    key={`booking-${booking.id}`}
                                    booking={booking}
                                    index={index}
                                    onUpdateStatus={updateBookingStatus}
                                    onOpenDriverModal={handleOpenDriverModal}
                                    updating={updating}
                                />
                            ))}
                        </View>
                    </Animated.View>
                )}
            </ScrollView>

            {/* ═══════════════════════════════════════════════════════════
                DRIVER SELECTION MODAL
            ═══════════════════════════════════════════════════════════ */}
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
                                availableDrivers.map(driver => (
                                    <TouchableOpacity
                                        key={driver.employee_id}
                                        style={[
                                            styles.driverOption,
                                            selectedDriverId === driver.employee_id && styles.selectedDriverOption,
                                        ]}
                                        onPress={() => setSelectedDriverId(driver.employee_id)}
                                    >
                                        <View style={styles.driverOptionContent}>
                                            {driver.profile_picture ? (
                                                <Image source={{ uri: driver.profile_picture }} style={styles.driverAvatar} />
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

            {/* ═══════════════════════════════════════════════════════════
                ODOMETER READING MODAL
            ═══════════════════════════════════════════════════════════ */}
            <Modal
                visible={odometerModal.visible}
                transparent
                animationType="slide"
                onRequestClose={closeOdometerModal}
            >
                <View style={{
                    flex: 1,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    justifyContent: 'center',
                    alignItems: 'center',
                    padding: 20,
                }}>
                    <View style={{
                        backgroundColor: '#FFF',
                        borderRadius: 20,
                        width: '100%',
                        maxWidth: 500,
                        height: 600,
                        overflow: 'hidden',
                    }}>
                        {/* Header */}
                        <View style={{
                            backgroundColor: '#075E54',
                            paddingVertical: 16,
                            paddingHorizontal: 20,
                            height: 80,
                        }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 18, fontWeight: '700', color: '#FFF' }}>
                                        {odometerModal.type === 'start' ? 'Start Trip' : 'Complete Trip'}
                                    </Text>
                                    <Text style={{ fontSize: 13, color: '#FFF', marginTop: 4 }}>
                                        Enter odometer readings for all vehicles
                                    </Text>
                                </View>
                                <TouchableOpacity
                                    onPress={closeOdometerModal}
                                    disabled={submittingOdometer}
                                    style={{ padding: 4 }}
                                >
                                    <MaterialCommunityIcons name="close" size={24} color="#FFF" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Vehicle inputs */}
                        <ScrollView
                            style={{ height: 440 }}
                            contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
                            showsVerticalScrollIndicator
                        >
                            <View style={{ alignItems: 'center', marginBottom: 20 }}>
                                <View style={{
                                    width: 60, height: 60, borderRadius: 30,
                                    backgroundColor: '#E8F5E9',
                                    alignItems: 'center', justifyContent: 'center',
                                    marginBottom: 10,
                                }}>
                                    <MaterialCommunityIcons
                                        name="speedometer" size={30}
                                        color={odometerModal.type === 'start' ? '#008069' : '#E53935'}
                                    />
                                </View>
                                <Text style={{ fontSize: 14, color: '#666', textAlign: 'center' }}>
                                    {odometerModal.type === 'start'
                                        ? 'Record start readings before departing'
                                        : 'Record end readings upon arrival'}
                                </Text>
                            </View>

                            {odometerModal.assignments.map((a, i) => (
                                <View
                                    key={a.id}
                                    style={{
                                        backgroundColor: '#F5F5F5',
                                        borderRadius: 12,
                                        padding: 16,
                                        marginBottom: 16,
                                    }}
                                >
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                                        <View style={{
                                            width: 32, height: 32, borderRadius: 16,
                                            backgroundColor: '#008069',
                                            alignItems: 'center', justifyContent: 'center',
                                            marginRight: 10,
                                        }}>
                                            <Text style={{ color: '#FFF', fontSize: 14, fontWeight: 'bold' }}>
                                                {i + 1}
                                            </Text>
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={{ fontSize: 15, fontWeight: 'bold', color: '#000' }}>
                                                {a.vehicle.make} {a.vehicle.model}
                                            </Text>
                                            <Text style={{ fontSize: 13, color: '#666' }}>
                                                {a.vehicle.license_plate}
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={{
                                        backgroundColor: '#FFF',
                                        borderRadius: 8,
                                        borderWidth: 2,
                                        borderColor: odometerReadings[a.id] ? '#008069' : '#DDD',
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        paddingHorizontal: 12,
                                        height: 50,
                                    }}>
                                        <MaterialCommunityIcons
                                            name="speedometer" size={20}
                                            color={odometerReadings[a.id] ? '#008069' : '#999'}
                                        />
                                        <TextInput
                                            style={{
                                                flex: 1, paddingHorizontal: 10,
                                                fontSize: 16, color: '#000', height: 50,
                                            }}
                                            value={odometerReadings[a.id] ?? ''}
                                            onChangeText={text => {
                                                const numeric = text.replace(/[^0-9]/g, '');
                                                setOdometerReadings(prev => ({ ...prev, [a.id]: numeric }));
                                            }}
                                            placeholder="Enter reading"
                                            placeholderTextColor="#999"
                                            keyboardType="numeric"
                                            editable={!submittingOdometer}
                                        />
                                        <Text style={{ fontSize: 13, color: '#666' }}>km</Text>
                                    </View>

                                    {odometerReadings[a.id] && (
                                        <View style={{
                                            flexDirection: 'row', alignItems: 'center',
                                            marginTop: 8, backgroundColor: '#E8F5E9',
                                            padding: 6, borderRadius: 6,
                                        }}>
                                            <MaterialCommunityIcons name="check-circle" size={14} color="#008069" />
                                            <Text style={{ fontSize: 11, color: '#008069', marginLeft: 4, fontWeight: '600' }}>
                                                Recorded: {Number(odometerReadings[a.id]).toLocaleString()} km
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            ))}
                        </ScrollView>

                        {/* Footer */}
                        <View style={{
                            flexDirection: 'row',
                            padding: 16,
                            borderTopWidth: 1,
                            borderTopColor: '#EEE',
                            height: 80,
                            backgroundColor: '#FAFAFA',
                        }}>
                            <TouchableOpacity
                                style={{
                                    flex: 1, paddingVertical: 12,
                                    backgroundColor: '#FFF',
                                    borderRadius: 8, borderWidth: 1, borderColor: '#DDD',
                                    alignItems: 'center', justifyContent: 'center',
                                    marginRight: 8,
                                }}
                                onPress={closeOdometerModal}
                                disabled={submittingOdometer}
                            >
                                <Text style={{ fontSize: 15, fontWeight: '600', color: '#666' }}>Cancel</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={{
                                    flex: 1, paddingVertical: 12,
                                    backgroundColor: (allReadingsEntered && !submittingOdometer) ? '#008069' : '#CCC',
                                    borderRadius: 8,
                                    alignItems: 'center', justifyContent: 'center',
                                    marginLeft: 8,
                                }}
                                onPress={handleOdometerConfirm}
                                disabled={!allReadingsEntered || submittingOdometer}
                            >
                                {submittingOdometer ? (
                                    <ActivityIndicator color="#FFF" size="small" />
                                ) : (
                                    <Text style={{ fontSize: 15, fontWeight: '600', color: '#FFF' }}>
                                        Confirm
                                    </Text>
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