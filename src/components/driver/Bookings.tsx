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

// ─── Status helpers ──────────────────────────────────────────────────────────

/**
 * Human-readable labels for each status.
 * "in-progress" shows as "Started", "completed" as "Ended".
 */
const STATUS_LABELS: Record<string, string> = {
    pending:      'Pending',
    assigned:     'Assigned',
    accepted:     'Accepted',
    'in-progress':'Started',
    completed:    'Ended',
    cancelled:    'Cancelled',
};

const getDisplayStatus = (s: string) => STATUS_LABELS[s.toLowerCase()] ?? s;

/**
 * Valid next states per current state (driver perspective).
 * Terminal states return an empty set.
 */
const NEXT_STATES: Record<string, string[]> = {
    pending:      ['assigned', 'cancelled'],
    assigned:     ['accepted', 'cancelled'],
    accepted:     ['in-progress', 'cancelled'],
    'in-progress':['completed'],
    completed:    [],
    cancelled:    [],
};

/** Whether a status requires extra input */
const needsCancellationReason = (s: string) => s === 'cancelled';
const needsOdometerStart      = (s: string) => s === 'in-progress';
const needsOdometerEnd        = (s: string) => s === 'completed';

const BackIcon = () => (
    <View style={styles.backIcon}>
        <View style={styles.backArrow} />
        <Text style={styles.backText}>Back</Text>
    </View>
);

// ─── Types ───────────────────────────────────────────────────────────────────

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

// ─── BookingCard ─────────────────────────────────────────────────────────────

const BookingCard: React.FC<{
    booking: ExtendedBooking;
    index: number;
    onUpdateStatus: (
        assignmentId: number,
        status: string,
        reason?: string,
        odometerStart?: string,
        odometerEnd?: string,
    ) => Promise<void>;
    updating: boolean;
}> = ({ booking, index, onUpdateStatus, updating }) => {
    const slideAnim = useRef(new Animated.Value(30)).current;

    const currentStatus = booking.status.toLowerCase();
    const nextStates    = NEXT_STATES[currentStatus] ?? [];
    const isTerminal    = nextStates.length === 0;

    const [selectedStatus,      setSelectedStatus]      = useState('');
    const [cancellationReason,  setCancellationReason]  = useState('');
    const [odometerStart,       setOdometerStart]       = useState('');
    const [odometerEnd,         setOdometerEnd]         = useState('');
    const [isUpdating,          setIsUpdating]          = useState(false);

    useEffect(() => {
        Animated.timing(slideAnim, {
            toValue: 0, duration: 400, delay: index * 100, useNativeDriver: true,
        }).start();
    }, []);

    // Reset extra-input state whenever selected status changes
    const handleSelectStatus = (s: string) => {
        setSelectedStatus(prev => prev === s ? '' : s); // toggle
        setCancellationReason('');
        setOdometerStart('');
        setOdometerEnd('');
    };

    const validateNumericOdometer = (val: string) => {
        const n = parseInt(val, 10);
        return !isNaN(n) && n >= 0;
    };

    const handleUpdate = async () => {
        if (!selectedStatus) return;

        if (needsCancellationReason(selectedStatus) && !cancellationReason.trim()) {
            Alert.alert('Required', 'Please enter a cancellation reason.');
            return;
        }
        if (needsOdometerStart(selectedStatus)) {
            if (!odometerStart.trim() || !validateNumericOdometer(odometerStart)) {
                Alert.alert('Required', 'Please enter a valid odometer start reading.');
                return;
            }
        }
        if (needsOdometerEnd(selectedStatus)) {
            if (!odometerEnd.trim() || !validateNumericOdometer(odometerEnd)) {
                Alert.alert('Required', 'Please enter a valid odometer end reading.');
                return;
            }
        }

        const assignment = booking.vehicle_assignments?.[0];
        if (!assignment) {
            Alert.alert('Error', 'Assignment not found.');
            return;
        }

        setIsUpdating(true);
        await onUpdateStatus(
            assignment.id,
            selectedStatus,
            cancellationReason || undefined,
            needsOdometerStart(selectedStatus)  ? odometerStart : undefined,
            needsOdometerEnd(selectedStatus)    ? odometerEnd   : undefined,
        );
        setIsUpdating(false);
        setSelectedStatus('');
        setCancellationReason('');
        setOdometerStart('');
        setOdometerEnd('');
    };

    const assignments     = booking.vehicle_assignments ?? [];
    const firstVehicle    = assignments[0]?.vehicle ?? null;

    // ── colour for the status pill ────────────────────────────────────────
    const statusColor = getStatusColor(booking.status);

    return (
        <Animated.View
            style={[
                styles.bookingCard,
                { transform: [{ translateY: slideAnim }] },
            ]}
        >
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

            {/* ── Accepted acknowledgement banner ──────────────────────── */}
            {currentStatus === 'accepted' && (
                <View style={{
                    marginHorizontal: 0,
                    marginBottom: 8,
                    backgroundColor: '#05c5ff',
                    borderRadius: 8,
                    padding: 10,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                }}>
                    <MaterialCommunityIcons name="check-decagram" size={18} color="#2E7D32" />
                    <Text style={{ color: '#2E7D32', fontSize: 13, fontWeight: '600', flex: 1 }}>
                        You've accepted this booking. Enter the odometer reading when you start the trip.
                    </Text>
                </View>
            )}

            {/* ── Body ─────────────────────────────────────────────────── */}
            <View style={styles.bookingCardBody}>
                <View style={styles.locationRow}>
                    <MaterialCommunityIcons name="account" size={16} color="#666" />
                    <Text style={styles.locationText}>
                        {booking.booked_for?.full_name ?? 'Unknown'}
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

            {/* ── Odometer summary (completed bookings) ────────────────── */}
            {currentStatus === 'completed' && assignments.length > 0 && (
                <View style={{
                    marginTop: 12,
                    padding: 12,
                    backgroundColor: '#F1F8FF',
                    borderRadius: 10,
                    gap: 6,
                }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#1565C0', marginBottom: 4 }}>
                        Trip Summary
                    </Text>
                    {assignments.map(a => {
                        const dist = (a.odometer_start_reading && a.odometer_end_reading)
                            ? parseInt(a.odometer_end_reading) - parseInt(a.odometer_start_reading)
                            : null;
                        return (
                            <View key={a.id} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                    <MaterialCommunityIcons name="speedometer" size={14} color="#43A047" />
                                    <Text style={{ fontSize: 12, color: '#333' }}>
                                        Start: {a.odometer_start_reading ?? 'N/A'}
                                    </Text>
                                </View>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                    <MaterialCommunityIcons name="speedometer" size={14} color="#E53935" />
                                    <Text style={{ fontSize: 12, color: '#333' }}>
                                        End: {a.odometer_end_reading ?? 'N/A'}
                                    </Text>
                                </View>
                                {dist !== null && (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                        <MaterialCommunityIcons name="map-marker-distance" size={14} color="#666" />
                                        <Text style={{ fontSize: 12, color: '#555', fontWeight: '600' }}>
                                            {dist.toLocaleString()} km
                                        </Text>
                                    </View>
                                )}
                            </View>
                        );
                    })}
                </View>
            )}

            {/* ── Status update section (hidden for terminal states) ────── */}
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

                    {/* ── Status pills (only valid next states) ────────── */}
                    <View style={styles.statusOptions}>
                        {nextStates.map(s => {
                            const color     = getStatusColor(s);
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

                    {/* ── Cancellation reason ──────────────────────────── */}
                    {selectedStatus === 'cancelled' && (
                        <View style={{ marginTop: 12 }}>
                            <View style={styles.inputContainer}>
                                <MaterialIcons
                                    name="warning"
                                    size={20}
                                    color="#FF3B30"
                                    style={styles.inputIcon}
                                />
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

                    {/* ── Odometer start (for accepted → in-progress) ──── */}
                    {selectedStatus === 'in-progress' && (
                        <View style={{ marginTop: 12 }}>
                            <View style={styles.inputContainer}>
                                <MaterialCommunityIcons
                                    name="speedometer"
                                    size={20}
                                    color="#00d285"
                                    style={styles.inputIcon}
                                />
                                <TextInput
                                    style={styles.textInput}
                                    value={odometerStart}
                                    onChangeText={setOdometerStart}
                                    placeholder="Odometer start reading (km)"
                                    placeholderTextColor="#888"
                                    keyboardType="numeric"
                                    maxLength={10}
                                />
                            </View>
                            <Text style={{ fontSize: 12, color: '#666', marginTop: 4, marginLeft: 40 }}>
                                Current odometer reading before starting the trip
                            </Text>
                        </View>
                    )}

                    {/* ── Odometer end (for in-progress → completed) ───── */}
                    {selectedStatus === 'completed' && (
                        <View style={{ marginTop: 12 }}>
                            <View style={styles.inputContainer}>
                                <MaterialCommunityIcons
                                    name="speedometer"
                                    size={20}
                                    color="#4A90E2"
                                    style={styles.inputIcon}
                                />
                                <TextInput
                                    style={styles.textInput}
                                    value={odometerEnd}
                                    onChangeText={setOdometerEnd}
                                    placeholder="Odometer end reading (km)"
                                    placeholderTextColor="#888"
                                    keyboardType="numeric"
                                    maxLength={10}
                                />
                            </View>
                            <Text style={{ fontSize: 12, color: '#666', marginTop: 4, marginLeft: 40 }}>
                                Current odometer reading at end of trip
                            </Text>
                        </View>
                    )}

                    {/* ── Confirm button ───────────────────────────────── */}
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
                                        {selectedStatus === 'accepted'     ? 'Accept Booking'
                                        : selectedStatus === 'in-progress' ? 'Start Trip'
                                        : selectedStatus === 'completed'   ? 'End Trip'
                                        : selectedStatus === 'cancelled'   ? 'Cancel Booking'
                                        : `Update to ${getDisplayStatus(selectedStatus)}`}
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>
                    )}
                </View>
            )}

            {/* ── Terminal state note ───────────────────────────────────── */}
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
    token, onBack, setActiveTab, activeTab, setLoading, loading,
}) => {
    const [bookings, setBookings] = useState<ExtendedBooking[]>([]);
    const [updating, setUpdating] = useState(false);
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (token) fetchBookings();
    }, [token]);

    useEffect(() => {
        if (!loading && bookings.length > 0) {
            Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
        }
    }, [loading, bookings]);

    const fetchBookings = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${BACKEND_URL}/employee/getCarBookings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                body: JSON.stringify({ token }),
            });
            const text = await response.text();
            if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
                const data = JSON.parse(text);
                if (response.ok) {
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

    const updateBookingStatus = async (
        assignmentId: number,
        newStatus: string,
        reason?: string,
        odometerStart?: string,
        odometerEnd?: string,
    ) => {
        setUpdating(true);
        try {
            const body: Record<string, unknown> = { token, assignment_id: assignmentId, status: newStatus };
            if (reason)         body.reason_of_cancellation = reason;
            if (odometerStart)  body.odometer_start_reading = odometerStart;
            if (odometerEnd)    body.odometer_end_reading   = odometerEnd;

            const response = await fetch(`${BACKEND_URL}/employee/updateCarBookings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                body: JSON.stringify(body),
            });
            const text = await response.text();
            if (text.trim().startsWith('{')) {
                const data = JSON.parse(text);
                if (response.ok) {
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
        }
    };

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
                                    <View style={styles.backIcon}>
                                        <View style={styles.backArrow} />
                                        <Text style={styles.backText}>Back</Text>
                                    </View>
                                </TouchableOpacity>
                                <View style={styles.headerCenter}>
                                    <Text style={styles.logoText}>CITADEL</Text>
                                </View>
                                <View style={{ width: 2 }} />
                            </View>
                        </View>
                        <View style={styles.titleSection}>
                            <Text style={styles.sectionTitle}>My Bookings</Text>
                            <Text style={styles.sectionSubtitle}>
                                {bookings.length} booking{bookings.length !== 1 ? 's' : ''} found
                            </Text>
                        </View>
                    </LinearGradient>
                </View>

                {/* ── Tab bar ────────────────────────────────────────── */}
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
                        <Text style={styles.emptyStateText}>Your booking history will appear here</Text>
                    </View>
                ) : (
                    <Animated.View style={{ opacity: fadeAnim, paddingHorizontal: 16, paddingBottom: 20 }}>
                        {bookings.map((booking, index) => {
                            const assignmentId = booking.vehicle_assignments?.[0]?.id;
                            const key = assignmentId
                                ? `assignment-${assignmentId}`
                                : `booking-${booking.id}`;
                            return (
                                <BookingCard
                                    key={key}
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