import React from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    TextInput, ActivityIndicator, Modal, KeyboardAvoidingView,
    Platform
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { CancelBookingModalProps } from './types';
import { formatDateTime } from './utils';


const CancelBookingModal: React.FC<CancelBookingModalProps> = ({
    visible,
    onClose,
    selectedBooking,
    cancelReason,
    setCancelReason,
    loading,
    onCancelBooking
}) => {
    // Get vehicle assignments
    const assignments = selectedBooking?.vehicle_assignments || [];
    const hasMultipleVehicles = assignments.length > 1;
    const firstVehicle = assignments.length > 0 && assignments[0].vehicle ? assignments[0].vehicle : null;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.keyboardAvoidingView}
                >
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Cancel Booking</Text>
                            <TouchableOpacity
                                style={styles.modalClose}
                                onPress={onClose}
                            >
                                <Ionicons name="close" size={24} color="#333" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalScroll}>
                            <Text style={styles.cancelWarning}>
                                Are you sure you want to cancel this booking?
                            </Text>

                            {selectedBooking && (
                                <View style={styles.bookingPreview}>
                                    {/* Vehicle Title */}
                                    <View style={styles.vehicleHeader}>
                                        <MaterialCommunityIcons name="car" size={20} color="#008069" />
                                        <Text style={styles.previewTitle}>
                                            {hasMultipleVehicles 
                                                ? `${assignments.length} Vehicles`
                                                : firstVehicle
                                                    ? `${firstVehicle.make} ${firstVehicle.model}`
                                                    : 'Vehicle Booking'}
                                        </Text>
                                    </View>

                                    {/* Show license plate for single vehicle */}
                                    {!hasMultipleVehicles && firstVehicle && (
                                        <Text style={styles.previewText}>
                                            {firstVehicle.license_plate}
                                        </Text>
                                    )}

                                    {/* Show all vehicles if multiple */}
                                    {hasMultipleVehicles && (
                                        <View style={styles.vehicleList}>
                                            {assignments.map((assignment, index) => (
                                                <Text key={assignment.id} style={styles.previewText}>
                                                    • {assignment.vehicle.make} {assignment.vehicle.model} ({assignment.vehicle.license_plate})
                                                </Text>
                                            ))}
                                        </View>
                                    )}

                                    {/* Purpose */}
                                    <View style={styles.detailRow}>
                                        <MaterialCommunityIcons name="text" size={16} color="#666" />
                                        <Text style={styles.previewText}>{selectedBooking.purpose}</Text>
                                    </View>

                                    {/* Location */}
                                    <View style={styles.locationSection}>
                                        <View style={styles.detailRow}>
                                            <MaterialCommunityIcons name="map-marker" size={16} color="#00d285" />
                                            <Text style={styles.previewText}>{selectedBooking.start_location}</Text>
                                        </View>
                                        <View style={styles.detailRow}>
                                            <MaterialCommunityIcons name="map-marker" size={16} color="#ff5e7a" />
                                            <Text style={styles.previewText}>{selectedBooking.end_location}</Text>
                                        </View>
                                    </View>

                                    {/* Time */}
                                    <View style={styles.detailRow}>
                                        <MaterialCommunityIcons name="clock-outline" size={16} color="#666" />
                                        <Text style={styles.previewTextSmall}>
                                            {formatDateTime(selectedBooking.start_time)} - {formatDateTime(selectedBooking.end_time)}
                                        </Text>
                                    </View>

                                    {/* Show booked for if applicable */}
                                    {selectedBooking.booked_for && (
                                        <View style={styles.detailRow}>
                                            <MaterialCommunityIcons name="account" size={16} color="#666" />
                                            <Text style={styles.previewText}>
                                                Booked for: {selectedBooking.booked_for.full_name}
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            )}

                            <View style={styles.formGroup}>
                                <Text style={styles.formLabel}>Reason for Cancellation *</Text>
                                <TextInput
                                    style={[styles.formInput, styles.textArea]}
                                    value={cancelReason}
                                    onChangeText={setCancelReason}
                                    placeholder="Please provide a reason for cancelling"
                                    placeholderTextColor="#999"
                                    multiline
                                    numberOfLines={3}
                                />
                            </View>

                            <View style={styles.modalButtons}>
                                <TouchableOpacity
                                    style={[styles.modalBtn, styles.modalBtnCancel]}
                                    onPress={onClose}
                                >
                                    <Text style={styles.modalBtnCancelText}>Keep Booking</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.modalBtn, styles.modalBtnConfirm, !cancelReason.trim() && styles.disabledBtn]}
                                    onPress={onCancelBooking}
                                    disabled={loading || !cancelReason.trim()}
                                >
                                    {loading ? (
                                        <ActivityIndicator color="#fff" size="small" />
                                    ) : (
                                        <Text style={styles.modalBtnConfirmText}>Cancel Booking</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
    },
    keyboardAvoidingView: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '80%',
        padding: 30,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 22,
        color: '#333',
        fontWeight: '600',
    },
    modalClose: {
        backgroundColor: '#f0f0f0',
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalScroll: {
        flexGrow: 0,
    },
    cancelWarning: {
        fontSize: 16,
        color: '#333',
        textAlign: 'center',
        marginBottom: 20,
    },
    bookingPreview: {
        backgroundColor: '#f8f9fa',
        padding: 15,
        borderRadius: 12,
        marginBottom: 20,
        borderLeftWidth: 3,
        borderLeftColor: '#ff5e7a',
    },
    vehicleHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    previewTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        marginLeft: 8,
    },
    vehicleList: {
        marginBottom: 10,
        paddingLeft: 5,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
    },
    locationSection: {
        marginBottom: 6,
    },
    previewText: {
        fontSize: 14,
        color: '#666',
        marginLeft: 6,
        flex: 1,
    },
    previewTextSmall: {
        fontSize: 13,
        color: '#666',
        marginLeft: 6,
        flex: 1,
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
    textArea: {
        minHeight: 100,
        textAlignVertical: 'top',
    },
    modalButtons: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 20,
    },
    modalBtn: {
        flex: 1,
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    modalBtnCancel: {
        backgroundColor: '#e0e0e0',
    },
    modalBtnConfirm: {
        backgroundColor: '#ff5e7a',
    },
    modalBtnCancelText: {
        color: '#333',
        fontWeight: '600',
    },
    modalBtnConfirmText: {
        color: '#fff',
        fontWeight: '600',
    },
    disabledBtn: {
        opacity: 0.5,
    },
});

export default CancelBookingModal;