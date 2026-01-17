import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    Modal,
    TextInput,
    ActivityIndicator,
    Alert,
    Platform,
    KeyboardAvoidingView,
    Image,
} from 'react-native';
import { MaterialCommunityIcons, MaterialIcons, Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { styles } from './styles';
import { BACKEND_URL } from '../../config/config';
import { AssignedEmployee, Vehicle, Driver } from './types';

interface BookingModalProps {
    visible: boolean;
    onClose: () => void;
    token: string | null;
    city: string;
    onBookingCreated: () => void;
}

interface BookingFormData {
    startLocation: string;
    endLocation: string;
    startTime: Date;
    endTime: Date;
    purpose: string;
    gracePeriod: string;
    bookingFor: AssignedEmployee | null;
}

type BookingStep = 'details' | 'vehicle' | 'driver';

const BookingModal: React.FC<BookingModalProps> = ({
    visible,
    onClose,
    token,
    city,
    onBookingCreated,
}) => {
    const [loading, setLoading] = useState(false);
    const [currentStep, setCurrentStep] = useState<BookingStep>('details');
    const [formData, setFormData] = useState<BookingFormData>({
        startLocation: '',
        endLocation: '',
        startTime: new Date(),
        endTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
        purpose: '',
        gracePeriod: '1',
        bookingFor: null,
    });
    const [showStartDatePicker, setShowStartDatePicker] = useState(false);
    const [showEndDatePicker, setShowEndDatePicker] = useState(false);
    const [userSearchQuery, setUserSearchQuery] = useState('');
    const [userResults, setUserResults] = useState<AssignedEmployee[]>([]);
    const [showUserSuggestions, setShowUserSuggestions] = useState(false);

    // Vehicle and Driver selection states
    const [availableVehicles, setAvailableVehicles] = useState<Vehicle[]>([]);
    const [availableDrivers, setAvailableDrivers] = useState<Driver[]>([]);
    const [selectedVehicles, setSelectedVehicles] = useState<Vehicle[]>([]);
    const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
    const [fetchingVehicles, setFetchingVehicles] = useState(false);
    const [fetchingDrivers, setFetchingDrivers] = useState(false);

    useEffect(() => {
        if (userSearchQuery.length >= 2) {
            searchUsers(userSearchQuery);
        } else {
            setUserResults([]);
        }
    }, [userSearchQuery]);

    const searchUsers = async (query: string) => {
        try {
            const response = await fetch(`${BACKEND_URL}/core/getPeople?query=${encodeURIComponent(query)}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                const data = await response.json();
                setUserResults(data.users || []);
            }
        } catch (error) {
            console.error('Error searching users:', error);
        }
    };

    const fetchAvailableVehicles = async () => {
        if (!formData.startLocation || !formData.endLocation) {
            Alert.alert('Error', 'Please fill in start and end locations first');
            return;
        }

        setFetchingVehicles(true);
        try {
            const response = await fetch(`${BACKEND_URL}/core/getAvailableVehicles`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    token,
                    city,
                    start_date: formData.startTime.toISOString(),
                    end_date: formData.endTime.toISOString(),
                }),
            });

            const data = await response.json();
            if (response.ok) {
                setAvailableVehicles(data.vehicles || []);
                setCurrentStep('vehicle');
            } else {
                Alert.alert('Error', data.message || 'Failed to fetch available vehicles');
            }
        } catch (error) {
            console.error('Error fetching vehicles:', error);
            Alert.alert('Error', 'Network error occurred');
        } finally {
            setFetchingVehicles(false);
        }
    };

    const fetchAvailableDrivers = async () => {
        setFetchingDrivers(true);
        try {
            const response = await fetch(`${BACKEND_URL}/core/getAvailableDrivers`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    token,
                    start_date: formData.startTime.toISOString(),
                    end_date: formData.endTime.toISOString(),
                }),
            });

            const data = await response.json();
            if (response.ok) {
                setAvailableDrivers(data.drivers || []);
                setCurrentStep('driver');
            } else {
                Alert.alert('Error', data.message || 'Failed to fetch available drivers');
            }
        } catch (error) {
            console.error('Error fetching drivers:', error);
            Alert.alert('Error', 'Network error occurred');
        } finally {
            setFetchingDrivers(false);
        }
    };

    const handleNextStep = () => {
        if (currentStep === 'details') {
            if (!formData.startLocation || !formData.endLocation || !formData.purpose) {
                Alert.alert('Error', 'Please fill in all required fields');
                return;
            }
            if (formData.endTime <= formData.startTime) {
                Alert.alert('Error', 'End time must be after start time');
                return;
            }
            fetchAvailableVehicles();
        } else if (currentStep === 'vehicle') {
            if (selectedVehicles.length === 0) {
                Alert.alert('Error', 'Please select at least one vehicle');
                return;
            }
            fetchAvailableDrivers();
        }
    };

    const handleSubmit = async () => {
        if (selectedVehicles.length === 0 || !selectedDriver) {
                Alert.alert('Error', 'Please select at least one vehicle and a driver');
                return;
}

        setLoading(true);
        try {
            const requestBody = {
                token,
                vehicle_ids: selectedVehicles.map(v => v.id),
                driver_ids: [selectedDriver.employee_id],
                start_time: formData.startTime.toISOString(),
                end_time: formData.endTime.toISOString(),
                purpose: formData.purpose,
                start_location: formData.startLocation,
                end_location: formData.endLocation,
                grace_period: parseInt(formData.gracePeriod) || 1,
                booked_for_employee_id: formData.bookingFor?.employee_id,
            };

            const response = await fetch(`${BACKEND_URL}/core/bookVehicle`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(requestBody),
            });

            const data = await response.json();
            if (response.ok) {
                Alert.alert('Success', 'Vehicle booked successfully!');
                onBookingCreated();
                resetForm();
                onClose();
            } else {
                Alert.alert('Error', data.message || 'Failed to book vehicle');
            }
        } catch (error) {
            console.error('Error booking vehicle:', error);
            Alert.alert('Error', 'Network error occurred');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            startLocation: '',
            endLocation: '',
            startTime: new Date(),
            endTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
            purpose: '',
            gracePeriod: '1',
            bookingFor: null,
        });
        setUserSearchQuery('');
        setUserResults([]);
        setCurrentStep('details');
        setAvailableVehicles([]);
        setAvailableDrivers([]);
        setSelectedVehicles([]);
        setSelectedDriver(null);
    };

    const formatDateTime = (date: Date) => {
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const renderStepIndicator = () => (
        <View style={styles.stepIndicator}>
            <View style={styles.stepItem}>
                <View style={[styles.stepCircle, currentStep === 'details' && styles.stepCircleActive]}>
                    <Text style={[styles.stepNumber, currentStep === 'details' && styles.stepNumberActive]}>1</Text>
                </View>
                <Text style={styles.stepLabel}>Details</Text>
            </View>
            <View style={styles.stepLine} />
            <View style={styles.stepItem}>
                <View style={[styles.stepCircle, currentStep === 'vehicle' && styles.stepCircleActive]}>
                    <Text style={[styles.stepNumber, currentStep === 'vehicle' && styles.stepNumberActive]}>2</Text>
                </View>
                <Text style={styles.stepLabel}>Vehicle</Text>
            </View>
            <View style={styles.stepLine} />
            <View style={styles.stepItem}>
                <View style={[styles.stepCircle, currentStep === 'driver' && styles.stepCircleActive]}>
                    <Text style={[styles.stepNumber, currentStep === 'driver' && styles.stepNumberActive]}>3</Text>
                </View>
                <Text style={styles.stepLabel}>Driver</Text>
            </View>
        </View>
    );

    const renderDetailsStep = () => (
        <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.modalScrollContent}
            keyboardShouldPersistTaps="handled"
        >
            {/* Location Section */}
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <MaterialCommunityIcons name="map-marker-path" size={20} color="#008069" />
                    <Text style={styles.sectionTitle}>Trip Details</Text>
                </View>

                <View style={styles.formGroup}>
                    <View style={styles.labelContainer}>
                        <Text style={styles.formLabel}>Start Location</Text>
                        <Text style={styles.requiredStar}>*</Text>
                    </View>
                    <View style={styles.inputContainer}>
                        <MaterialCommunityIcons
                            name="map-marker-outline"
                            size={20}
                            color="#008069"
                            style={styles.inputIcon}
                        />
                        <TextInput
                            style={styles.textInput}
                            value={formData.startLocation}
                            onChangeText={(text) => setFormData({ ...formData, startLocation: text })}
                            placeholder="Where are you starting from?"
                            placeholderTextColor="#8E8E93"
                        />
                    </View>
                </View>

                <View style={styles.formGroup}>
                    <View style={styles.labelContainer}>
                        <Text style={styles.formLabel}>End Location</Text>
                        <Text style={styles.requiredStar}>*</Text>
                    </View>
                    <View style={styles.inputContainer}>
                        <MaterialCommunityIcons
                            name="map-marker-check-outline"
                            size={20}
                            color="#008069"
                            style={styles.inputIcon}
                        />
                        <TextInput
                            style={styles.textInput}
                            value={formData.endLocation}
                            onChangeText={(text) => setFormData({ ...formData, endLocation: text })}
                            placeholder="Where are you going?"
                            placeholderTextColor="#8E8E93"
                        />
                    </View>
                </View>
            </View>

            {/* Date & Time Section */}
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <MaterialIcons name="date-range" size={20} color="#008069" />
                    <Text style={styles.sectionTitle}>Date & Time</Text>
                </View>

                <View style={styles.formGroup}>
                    <View style={styles.labelContainer}>
                        <Text style={styles.formLabel}>Start Time</Text>
                        <Text style={styles.requiredStar}>*</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.dateTimeButton}
                        onPress={() => setShowStartDatePicker(true)}
                        activeOpacity={0.7}
                    >
                        <MaterialIcons name="access-time" size={20} color="#008069" />
                        <Text style={styles.dateTimeButtonText}>
                            {formatDateTime(formData.startTime)}
                        </Text>
                        <MaterialIcons name="chevron-right" size={20} color="#C7C7CC" />
                    </TouchableOpacity>
                    {showStartDatePicker && (
                        <DateTimePicker
                            value={formData.startTime}
                            mode="datetime"
                            display="default"
                            onChange={(event, selectedDate) => {
                                setShowStartDatePicker(Platform.OS === 'ios');
                                if (event.type === 'set' && selectedDate) {
                                    setFormData({ ...formData, startTime: selectedDate });
                                }
                            }}
                        />
                    )}
                </View>

                <View style={styles.formGroup}>
                    <View style={styles.labelContainer}>
                        <Text style={styles.formLabel}>End Time</Text>
                        <Text style={styles.requiredStar}>*</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.dateTimeButton}
                        onPress={() => setShowEndDatePicker(true)}
                        activeOpacity={0.7}
                    >
                        <MaterialIcons name="access-time" size={20} color="#008069" />
                        <Text style={styles.dateTimeButtonText}>
                            {formatDateTime(formData.endTime)}
                        </Text>
                        <MaterialIcons name="chevron-right" size={20} color="#C7C7CC" />
                    </TouchableOpacity>
                    {showEndDatePicker && (
                        <DateTimePicker
                            value={formData.endTime}
                            mode="datetime"
                            display="default"
                            onChange={(event, selectedDate) => {
                                setShowEndDatePicker(Platform.OS === 'ios');
                                if (event.type === 'set' && selectedDate) {
                                    setFormData({ ...formData, endTime: selectedDate });
                                }
                            }}
                        />
                    )}
                </View>
            </View>

            {/* Purpose Section */}
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <MaterialCommunityIcons name="text-box-outline" size={20} color="#008069" />
                    <Text style={styles.sectionTitle}>Trip Purpose</Text>
                </View>

                <View style={styles.formGroup}>
                    <View style={styles.labelContainer}>
                        <Text style={styles.formLabel}>Purpose</Text>
                        <Text style={styles.requiredStar}>*</Text>
                    </View>
                    <View style={styles.textAreaContainer}>
                        <TextInput
                            style={styles.textAreaInput}
                            value={formData.purpose}
                            onChangeText={(text) => setFormData({ ...formData, purpose: text })}
                            placeholder="What's the purpose of this trip?"
                            placeholderTextColor="#8E8E93"
                            multiline
                            numberOfLines={4}
                            textAlignVertical="top"
                        />
                    </View>
                </View>

                <View style={styles.formGroup}>
                    <View style={styles.labelContainer}>
                        <Text style={styles.formLabel}>Grace Period</Text>
                        <Text style={styles.optionalText}>(Optional)</Text>
                    </View>
                    <View style={styles.inputContainer}>
                        <MaterialCommunityIcons
                            name="timer-outline"
                            size={20}
                            color="#008069"
                            style={styles.inputIcon}
                        />
                        <TextInput
                            style={styles.textInput}
                            value={formData.gracePeriod}
                            onChangeText={(text) => setFormData({ ...formData, gracePeriod: text })}
                            placeholder="1 hour"
                            placeholderTextColor="#8E8E93"
                            keyboardType="numeric"
                        />
                        <Text style={styles.inputUnit}>hours</Text>
                    </View>
                </View>
            </View>

            {/* Book For Section */}
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <MaterialIcons name="person-outline" size={20} color="#008069" />
                    <Text style={styles.sectionTitle}>Booking For</Text>
                </View>

                <View style={styles.formGroup}>
                    <View style={styles.labelContainer}>
                        <Text style={styles.formLabel}>Employee</Text>
                    </View>

                    {formData.bookingFor ? (
                        <View style={styles.selectedUserCard}>
                            <View style={styles.selectedUserContent}>
                                <View style={styles.selectedUserAvatar}>
                                    <Text style={styles.selectedUserAvatarText}>
                                        {formData.bookingFor.full_name.split(' ').map(n => n[0]).join('')}
                                    </Text>
                                </View>
                                <View style={styles.selectedUserInfo}>
                                    <Text style={styles.selectedUserName}>{formData.bookingFor.full_name}</Text>
                                    <Text style={styles.selectedUserEmail}>{formData.bookingFor.email}</Text>
                                </View>
                            </View>
                            <TouchableOpacity
                                style={styles.removeUserButton}
                                onPress={() => setFormData({ ...formData, bookingFor: null })}
                            >
                                <MaterialIcons name="close" size={18} color="#FF3B30" />
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <>
                            <TouchableOpacity
                                style={styles.searchButton}
                                onPress={() => setShowUserSuggestions(!showUserSuggestions)}
                                activeOpacity={0.7}
                            >
                                <MaterialIcons name="person-search" size={20} color="#008069" />
                                <Text style={styles.searchButtonText}>Search employee</Text>
                                <MaterialIcons name="search" size={20} color="#C7C7CC" />
                            </TouchableOpacity>

                            {showUserSuggestions && (
                                <View style={styles.searchContainer}>
                                    <View style={styles.searchInputContainer}>
                                        <MaterialIcons name="search" size={20} color="#8E8E93" />
                                        <TextInput
                                            style={styles.searchInput}
                                            placeholder="Search by name or email"
                                            value={userSearchQuery}
                                            onChangeText={setUserSearchQuery}
                                            placeholderTextColor="#8E8E93"
                                            autoFocus
                                        />
                                        {userSearchQuery.length > 0 && (
                                            <TouchableOpacity onPress={() => setUserSearchQuery('')}>
                                                <MaterialIcons name="close" size={20} color="#8E8E93" />
                                            </TouchableOpacity>
                                        )}
                                    </View>

                                    {userResults.length > 0 ? (
                                        <ScrollView style={styles.resultsList}>
                                            {userResults.map((user) => (
                                                <TouchableOpacity
                                                    key={user.employee_id}
                                                    style={styles.userResult}
                                                    onPress={() => {
                                                        setFormData({ ...formData, bookingFor: user });
                                                        setShowUserSuggestions(false);
                                                        setUserSearchQuery('');
                                                    }}
                                                    activeOpacity={0.7}
                                                >
                                                    <View style={styles.resultAvatar}>
                                                        <Text style={styles.resultAvatarText}>
                                                            {user.full_name.split(' ').map(n => n[0]).join('')}
                                                        </Text>
                                                    </View>
                                                    <View style={styles.resultInfo}>
                                                        <Text style={styles.resultName}>{user.full_name}</Text>
                                                        <Text style={styles.resultEmail}>{user.email}</Text>
                                                    </View>
                                                    <MaterialIcons name="chevron-right" size={20} color="#C7C7CC" />
                                                </TouchableOpacity>
                                            ))}
                                        </ScrollView>
                                    ) : userSearchQuery.length >= 2 ? (
                                        <View style={styles.noResults}>
                                            <MaterialIcons name="person-off" size={40} color="#C7C7CC" />
                                            <Text style={styles.noResultsText}>No employees found</Text>
                                        </View>
                                    ) : null}
                                </View>
                            )}
                        </>
                    )}
                </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.modalActions}>
                <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={onClose}
                    disabled={loading || fetchingVehicles}
                    activeOpacity={0.7}
                >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.submitButton, (loading || fetchingVehicles) && styles.submitButtonDisabled]}
                    onPress={handleNextStep}
                    disabled={loading || fetchingVehicles}
                    activeOpacity={0.7}
                >
                    {fetchingVehicles ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                        <>
                            <Text style={styles.submitButtonText}>Next: Select Vehicle</Text>
                            <MaterialIcons name="arrow-forward" size={20} color="#FFFFFF" />
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </ScrollView>
    );

    const renderVehicleStep = () => (
        <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.modalScrollContent}
        >
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <MaterialCommunityIcons name="car" size={22} color="#008069" />
                    <Text style={styles.sectionTitle}>Select Your Vehicle</Text>
                </View>
                <Text style={styles.sectionDescription}>
                    Choose from {availableVehicles.length} available vehicle{availableVehicles.length !== 1 ? 's' : ''}
                </Text>

                {availableVehicles.length === 0 ? (
                    <View style={styles.emptyStateContainer}>
                        <View style={styles.emptyIconCircle}>
                            <MaterialCommunityIcons name="car-off" size={50} color="#008069" />
                        </View>
                        <Text style={styles.emptyStateTitle}>No Vehicles Available</Text>
                        <Text style={styles.emptyStateText}>
                            There are no vehicles available for your selected time slot.
                        </Text>
                    </View>
                ) : (
                    <View style={styles.vehicleListContainer}>
                        {availableVehicles.map((vehicle) => (
                            <TouchableOpacity
                                key={vehicle.id}
                                style={[
                                    styles.vehicleCard,
                                   selectedVehicles.some(v => v.id === vehicle.id) && styles.selectedCard
                                ]}
                                onPress={() => {
                                    setSelectedVehicles(prev => {
                                        const isSelected = prev.some(v => v.id === vehicle.id);
                                        if (isSelected) {
                                            return prev.filter(v => v.id !== vehicle.id);
                                        } else {
                                            return [...prev, vehicle];
                                        }
                                    });
                                }}
                                activeOpacity={0.7}
                            >
                                <View style={styles.vehicleCardContent}>
                                    {vehicle.vehicle_photos && vehicle.vehicle_photos.length > 0 ? (
                                        <Image
                                            source={{ uri: vehicle.vehicle_photos[0].photo }}
                                            style={styles.vehicleImage}
                                            resizeMode="cover"
                                        />
                                    ) : (
                                        <View style={styles.vehicleImagePlaceholder}>
                                            <MaterialCommunityIcons name="car" size={40} color="#C7C7CC" />
                                        </View>
                                    )}
                                    <View style={styles.vehicleDetails}>
                                        <Text style={styles.vehicleName}>
                                            {vehicle.make} {vehicle.model}
                                        </Text>
                                        <Text style={styles.vehicleMeta}>
                                            {vehicle.license_plate} • {vehicle.color} • {vehicle.year}
                                        </Text>
                                        <View style={styles.vehicleSpecs}>
                                            <View style={styles.specBadge}>
                                                <MaterialCommunityIcons name="gas-station" size={14} color="#008069" />
                                                <Text style={styles.specText}>{vehicle.fuel_type}</Text>
                                            </View>
                                            <View style={styles.specBadge}>
                                                <MaterialCommunityIcons name="seat-passenger" size={14} color="#008069" />
                                                <Text style={styles.specText}>{vehicle.seating_capacity} Seats</Text>
                                            </View>
                                        </View>
                                    </View>
                                    {selectedVehicles.some(v => v.id === vehicle.id) && (
                                        <View style={styles.selectedIconContainer}>
                                            <MaterialIcons name="check-circle" size={28} color="#008069" />
                                        </View>
                                    )}
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
            </View>
            <View style={styles.modalActionsFooter}>
                <TouchableOpacity
                    style={styles.backButtonSecondary}
                    onPress={() => setCurrentStep('details')}
                    activeOpacity={0.7}
                >
                    <MaterialIcons name="arrow-back" size={22} color="#008069" />
                    <Text style={styles.backButtonText}>Back</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.nextButton, (selectedVehicles.length === 0 || fetchingDrivers) && styles.nextButtonDisabled]}
                    onPress={handleNextStep}
                    disabled={selectedVehicles.length === 0 || fetchingDrivers}
                    activeOpacity={0.7}
                >
                    {fetchingDrivers ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                        <>
                            <Text style={styles.nextButtonText}>Continue to Driver</Text>
                            <MaterialIcons name="arrow-forward" size={22} color="#FFFFFF" />
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </ScrollView>
    );

    const renderDriverStep = () => (
        <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.modalScrollContent}
        >
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <MaterialCommunityIcons name="account" size={20} color="#008069" />
                    <Text style={styles.sectionTitle}>Available Drivers</Text>
                </View>

                {availableDrivers.length === 0 ? (
                    <View style={styles.noResults}>
                        <MaterialCommunityIcons name="account-off" size={40} color="#C7C7CC" />
                        <Text style={styles.noResultsText}>No drivers available</Text>
                    </View>
                ) : (
                    availableDrivers.map((driver) => (
                        <TouchableOpacity
                            key={driver.employee_id}
                            style={[
                                styles.driverCard,
                                selectedDriver?.employee_id === driver.employee_id && styles.selectedCard
                            ]}
                            onPress={() => setSelectedDriver(driver)}
                            activeOpacity={0.7}
                        >
                            <View style={styles.driverAvatar}>
                                <Text style={styles.driverAvatarText}>
                                    {driver.full_name.split(' ').map(n => n[0]).join('')}
                                </Text>
                            </View>
                            <View style={styles.driverInfo}>
                                <Text style={styles.driverName}>{driver.full_name}</Text>
                                <Text style={styles.driverMeta}>
                                    {driver.employee_id} • {driver.email}
                                </Text>
                            </View>
                            {selectedDriver?.employee_id === driver.employee_id && (
                                <MaterialIcons name="check-circle" size={24} color="#00d285" />
                            )}
                        </TouchableOpacity>
                    ))
                )}
            </View>

            <View style={styles.modalActions}>
                <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => setCurrentStep('vehicle')}
                    activeOpacity={0.7}
                >
                    <MaterialIcons name="arrow-back" size={20} color="#666" />
                    <Text style={styles.cancelButtonText}>Back</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.submitButton, (!selectedDriver || loading) && styles.submitButtonDisabled]}
                    onPress={handleSubmit}
                    disabled={!selectedDriver || loading}
                    activeOpacity={0.7}
                >
                    {loading ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                        <>
                            <MaterialIcons name="check-circle-outline" size={20} color="#FFFFFF" />
                            <Text style={styles.submitButtonText}>Confirm Booking</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </ScrollView>
    );

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
                    <View style={styles.modalContainer}>
                        {/* Header */}
                        <View style={styles.modalHeader}>
                            <View style={styles.headerLeft}>
                                <TouchableOpacity style={styles.backButton} onPress={onClose}>
                                    <View style={styles.backIcon}>
                                        <View style={styles.backArrow} />
                                    </View>
                                </TouchableOpacity>
                                <View style={styles.headerTitleContainer}>
                                    <Text style={styles.modalTitle}>New Booking</Text>
                                    <Text style={styles.modalSubtitle}>City: {city}</Text>
                                </View>
                            </View>
                            <TouchableOpacity style={styles.headerIconButton} onPress={onClose}>
                                <Ionicons name="close" size={22} color="#FFFFFF" />
                            </TouchableOpacity>
                        </View>

                        {/* Step Indicator */}
                        {renderStepIndicator()}

                        {/* Render Current Step */}
                        {currentStep === 'details' && renderDetailsStep()}
                        {currentStep === 'vehicle' && renderVehicleStep()}
                        {currentStep === 'driver' && renderDriverStep()}
                    </View>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
};

export default BookingModal;