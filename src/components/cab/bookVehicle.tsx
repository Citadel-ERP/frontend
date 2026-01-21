import React, { useState, useRef, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    TextInput, ActivityIndicator, Modal, KeyboardAvoidingView,
    Platform
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BookingFormData, AssignedEmployee, Vehicle, BookVehicleModalProps } from './types';
import { BACKEND_URL } from '../../config/config';



const BookVehicleModal: React.FC<BookVehicleModalProps> = ({
    visible,
    onClose,
    bookingForm,
    setBookingForm,
    loading,
    onBookVehicle,
    selectedVehicles
}) => {
    const [localSearchQuery, setLocalSearchQuery] = useState('');
    const [localUserResults, setLocalUserResults] = useState<AssignedEmployee[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [showUserSearch, setShowUserSearch] = useState(false);
    const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, []);

    const searchPeople = async (query: string) => {
        if (query.length < 2) {
            setLocalUserResults([]);
            return;
        }

        setSearchLoading(true);
        try {
            const response = await fetch(
                `${BACKEND_URL}/core/getPeople?query=${encodeURIComponent(query)}`,
                {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' },
                }
            );

            if (response.ok) {
                const data = await response.json();
                setLocalUserResults(data.users || []);
            } else {
                setLocalUserResults([]);
            }
        } catch (error) {
            console.error('Error searching people:', error);
            setLocalUserResults([]);
        } finally {
            setSearchLoading(false);
        }
    };

    const handleSearchChange = (text: string) => {
        setLocalSearchQuery(text);

        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        if (text.length >= 2) {
            searchTimeoutRef.current = setTimeout(() => {
                searchPeople(text);
            }, 400);
        } else {
            setLocalUserResults([]);
        }
    };

    const handleSelectUser = (user: AssignedEmployee) => {
        setBookingForm({ ...bookingForm, bookingFor: user });
        setLocalSearchQuery('');
        setLocalUserResults([]);
        setShowUserSearch(false);
    };

    const handleRemoveUser = () => {
        setBookingForm({ ...bookingForm, bookingFor: null });
        setLocalSearchQuery('');
        setLocalUserResults([]);
        setShowUserSearch(false);
    };

    const handleCheckboxPress = () => {
        if (!bookingForm.bookingFor) {
            setShowUserSearch(!showUserSearch);
        } else {
            handleRemoveUser();
        }
    };

    const vehiclesWithoutDrivers = selectedVehicles.filter(sv => !sv.driver);
    const canProceed = bookingForm.purpose.trim().length > 0;

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
                            <Text style={styles.modalTitle}>Confirm Booking</Text>
                            <TouchableOpacity
                                style={styles.modalClose}
                                onPress={onClose}
                            >
                                <MaterialCommunityIcons name="close" size={24} color="#333" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                            {/* Booking Summary */}
                            <View style={styles.summarySection}>
                                <Text style={styles.sectionTitle}>Booking Summary</Text>
                                <View style={styles.summaryCard}>
                                    <View style={styles.summaryRow}>
                                        <MaterialCommunityIcons name="car-multiple" size={20} color="#008069" />
                                        <Text style={styles.summaryText}>
                                            {selectedVehicles.length} Vehicle{selectedVehicles.length !== 1 ? 's' : ''}
                                        </Text>
                                    </View>
                                    <View style={styles.summaryRow}>
                                        <MaterialCommunityIcons name="account" size={20} color="#00d285" />
                                        <Text style={styles.summaryText}>
                                            {selectedVehicles.filter(sv => sv.driver).length} Driver{selectedVehicles.filter(sv => sv.driver).length !== 1 ? 's' : ''} Assigned
                                        </Text>
                                    </View>
                                    
                                    {vehiclesWithoutDrivers.length > 0 && (
                                        <View style={styles.warningBox}>
                                            <MaterialCommunityIcons name="alert" size={18} color="#ffb157" />
                                            <Text style={styles.warningText}>
                                                {vehiclesWithoutDrivers.length} vehicle{vehiclesWithoutDrivers.length !== 1 ? 's' : ''} without driver. Will be assigned later.
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            </View>

                            {/* Selected Vehicles List */}
                            <View style={styles.vehiclesSection}>
                                <Text style={styles.sectionTitle}>Selected Vehicles</Text>
                                {selectedVehicles.map((sv, index) => (
                                    <View key={sv.vehicle.id} style={styles.vehicleItem}>
                                        <View style={styles.vehicleNumber}>
                                            <Text style={styles.vehicleNumberText}>{index + 1}</Text>
                                        </View>
                                        <View style={styles.vehicleInfo}>
                                            <Text style={styles.vehicleName}>
                                                {sv.vehicle.make} {sv.vehicle.model}
                                            </Text>
                                            <Text style={styles.vehiclePlate}>{sv.vehicle.license_plate}</Text>
                                            {sv.driver && (
                                                <View style={styles.driverTag}>
                                                    <MaterialCommunityIcons name="account-check" size={14} color="#00d285" />
                                                    <Text style={styles.driverTagText}>{sv.driver.full_name}</Text>
                                                </View>
                                            )}
                                        </View>
                                    </View>
                                ))}
                            </View>

                            {/* Purpose Field */}
                            <View style={styles.formGroup}>
                                <Text style={styles.formLabel}>Purpose of Trip *</Text>
                                <TextInput
                                    style={[styles.formInput, styles.textArea]}
                                    value={bookingForm.purpose}
                                    onChangeText={(text) => setBookingForm({ ...bookingForm, purpose: text })}
                                    placeholder="e.g., Client meeting, Site visit, Airport pickup"
                                    placeholderTextColor="#999"
                                    multiline
                                    numberOfLines={3}
                                />
                            </View>

                            {/* Grace Period */}
                            <View style={styles.formGroup}>
                                <Text style={styles.formLabel}>Grace Period (hours)</Text>
                                <TextInput
                                    style={styles.formInput}
                                    value={bookingForm.gracePeriod}
                                    onChangeText={(text) => setBookingForm({ ...bookingForm, gracePeriod: text })}
                                    placeholder="1"
                                    placeholderTextColor="#999"
                                    keyboardType="numeric"
                                />
                                <Text style={styles.helperText}>Buffer time for unexpected delays</Text>
                            </View>

                            {/* Booking for someone else - REDESIGNED */}
                            <View style={styles.bookingForSection}>
                                <TouchableOpacity
                                    style={styles.checkboxWrapper}
                                    onPress={handleCheckboxPress}
                                    activeOpacity={0.7}
                                >
                                    <MaterialCommunityIcons
                                        name={bookingForm.bookingFor ? "checkbox-marked" : "checkbox-blank-outline"}
                                        size={24}
                                        color="#008069"
                                    />
                                    <Text style={styles.checkboxLabel}>Booking for someone else</Text>
                                </TouchableOpacity>

                                {showUserSearch && !bookingForm.bookingFor && (
                                    <View style={styles.searchPanel}>
                                        <TextInput
                                            style={styles.searchInput}
                                            placeholder="Search by name or employee ID"
                                            placeholderTextColor="#999"
                                            value={localSearchQuery}
                                            onChangeText={handleSearchChange}
                                            autoFocus
                                        />
                                        
                                        {searchLoading && (
                                            <View style={styles.loadingContainer}>
                                                <ActivityIndicator size="small" color="#008069" />
                                                <Text style={styles.loadingText}>Searching...</Text>
                                            </View>
                                        )}
                                        
                                        {!searchLoading && localUserResults.length > 0 && (
                                            <ScrollView 
                                                style={styles.autocompleteList}
                                                keyboardShouldPersistTaps="handled"
                                                nestedScrollEnabled
                                            >
                                                {localUserResults.map((user) => (
                                                    <TouchableOpacity
                                                        key={user.employee_id}
                                                        style={styles.autocompleteItem}
                                                        onPress={() => handleSelectUser(user)}
                                                    >
                                                        <View style={styles.userAvatar}>
                                                            <Text style={styles.userAvatarText}>
                                                                {user.full_name.split(' ').map(n => n[0]).join('')}
                                                            </Text>
                                                        </View>
                                                        <View style={styles.userInfo}>
                                                            <Text style={styles.userName}>{user.full_name}</Text>
                                                            <Text style={styles.userDetails}>
                                                                {user.employee_id} • {user.email}
                                                            </Text>
                                                        </View>
                                                    </TouchableOpacity>
                                                ))}
                                            </ScrollView>
                                        )}
                                        
                                        {!searchLoading && localSearchQuery.length >= 2 && localUserResults.length === 0 && (
                                            <View style={styles.noResults}>
                                                <MaterialCommunityIcons name="account-search" size={32} color="#ccc" />
                                                <Text style={styles.noResultsText}>No users found</Text>
                                            </View>
                                        )}
                                    </View>
                                )}

                                {bookingForm.bookingFor && (
                                    <View style={styles.selectedPerson}>
                                        <View style={styles.selectedPersonAvatar}>
                                            <Text style={styles.selectedPersonAvatarText}>
                                                {bookingForm.bookingFor.full_name.split(' ').map(n => n[0]).join('')}
                                            </Text>
                                        </View>
                                        <View style={styles.selectedPersonInfo}>
                                            <Text style={styles.selectedPersonName}>{bookingForm.bookingFor.full_name}</Text>
                                            <Text style={styles.selectedPersonDetails}>
                                                {bookingForm.bookingFor.employee_id} • {bookingForm.bookingFor.email}
                                            </Text>
                                        </View>
                                        <TouchableOpacity
                                            style={styles.removeBtn}
                                            onPress={handleRemoveUser}
                                        >
                                            <MaterialCommunityIcons name="close-circle" size={24} color="#ff5e7a" />
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>

                            <TouchableOpacity
                                style={[styles.confirmBtn, (!canProceed || loading) && styles.disabledBtn]}
                                onPress={onBookVehicle}
                                disabled={!canProceed || loading}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#fff" size="small" />
                                ) : (
                                    <>
                                        <Text style={styles.confirmBtnText}>Confirm Booking</Text>
                                        <MaterialCommunityIcons name="check-circle" size={20} color="#fff" />
                                    </>
                                )}
                            </TouchableOpacity>
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
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '90%',
        paddingTop: 20,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    modalTitle: {
        fontSize: 22,
        color: '#333',
        fontWeight: '600',
    },
    modalClose: {
        padding: 4,
    },
    modalScroll: {
        paddingHorizontal: 20,
        paddingTop: 20,
    },
    summarySection: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 12,
    },
    summaryCard: {
        backgroundColor: '#f8f9fa',
        padding: 16,
        borderRadius: 12,
        gap: 10,
    },
    summaryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    summaryText: {
        fontSize: 14,
        color: '#333',
        fontWeight: '500',
    },
    warningBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 177, 87, 0.1)',
        padding: 10,
        borderRadius: 8,
        gap: 8,
        marginTop: 4,
    },
    warningText: {
        fontSize: 12,
        color: '#ffb157',
        flex: 1,
    },
    vehiclesSection: {
        marginBottom: 20,
    },
    vehicleItem: {
        flexDirection: 'row',
        backgroundColor: '#f8f9fa',
        padding: 14,
        borderRadius: 12,
        marginBottom: 10,
        alignItems: 'center',
        gap: 12,
    },
    vehicleNumber: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#008069',
        alignItems: 'center',
        justifyContent: 'center',
    },
    vehicleNumberText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 14,
    },
    vehicleInfo: {
        flex: 1,
    },
    vehicleName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#333',
    },
    vehiclePlate: {
        fontSize: 12,
        color: '#666',
        marginTop: 2,
    },
    driverTag: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 6,
        gap: 4,
    },
    driverTagText: {
        fontSize: 12,
        color: '#00d285',
        fontWeight: '500',
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
        borderWidth: 1,
        borderColor: '#e0e0e0',
        borderRadius: 12,
        paddingHorizontal: 15,
        paddingVertical: 12,
        fontSize: 15,
        color: '#333',
    },
    textArea: {
        minHeight: 80,
        textAlignVertical: 'top',
    },
    helperText: {
        fontSize: 12,
        color: '#999',
        marginTop: 6,
    },
    bookingForSection: {
        marginBottom: 20,
    },
    checkboxWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        gap: 10,
    },
    checkboxLabel: {
        fontSize: 15,
        color: '#333',
        fontWeight: '500',
    },
    searchPanel: {
        marginTop: 12,
        backgroundColor: '#f8f9fa',
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    searchInput: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#e0e0e0',
        borderRadius: 10,
        paddingHorizontal: 15,
        paddingVertical: 12,
        fontSize: 15,
        color: '#333',
    },
    selectedPerson: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 128, 105, 0.08)',
        paddingHorizontal: 15,
        paddingVertical: 12,
        borderRadius: 12,
        marginTop: 12,
        borderWidth: 1,
        borderColor: 'rgba(0, 128, 105, 0.2)',
    },
    selectedPersonAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#008069',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    selectedPersonAvatarText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 14,
    },
    selectedPersonInfo: {
        flex: 1,
    },
    selectedPersonName: {
        color: '#008069',
        fontWeight: '600',
        fontSize: 15,
    },
    selectedPersonDetails: {
        color: '#666',
        fontSize: 12,
        marginTop: 2,
    },
    removeBtn: {
        padding: 4,
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        backgroundColor: '#fff',
        borderRadius: 10,
        marginTop: 8,
    },
    loadingText: {
        marginLeft: 10,
        color: '#666',
        fontSize: 14,
    },
    autocompleteList: {
        maxHeight: 200,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#e0e0e0',
        borderRadius: 10,
        marginTop: 8,
    },
    autocompleteItem: {
        padding: 12,
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    userAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#008069',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    userAvatarText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 13,
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        fontWeight: '600',
        color: '#333',
        fontSize: 14,
    },
    userDetails: {
        fontSize: 12,
        color: '#666',
        marginTop: 2,
    },
    noResults: {
        padding: 24,
        backgroundColor: '#fff',
        borderRadius: 10,
        marginTop: 8,
        alignItems: 'center',
    },
    noResultsText: {
        color: '#666',
        fontSize: 14,
        marginTop: 8,
    },
    confirmBtn: {
        backgroundColor: '#00d285',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 10,
        marginBottom: 30,
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
    },
    confirmBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    disabledBtn: {
        opacity: 0.5,
    },
});

export default BookVehicleModal;