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
} from 'react-native';
import { MaterialCommunityIcons, MaterialIcons, Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { styles } from './styles';
import { BACKEND_URL } from '../../config/config';
import { AssignedEmployee, Vehicle } from './types';

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

const BookingModal: React.FC<BookingModalProps> = ({
    visible,
    onClose,
    token,
    city,
    onBookingCreated,
}) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState<BookingFormData>({
        startLocation: '',
        endLocation: '',
        startTime: new Date(),
        endTime: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
        purpose: '',
        gracePeriod: '1',
        bookingFor: null,
    });
    const [showStartDatePicker, setShowStartDatePicker] = useState(false);
    const [showEndDatePicker, setShowEndDatePicker] = useState(false);
    const [userSearchQuery, setUserSearchQuery] = useState('');
    const [userResults, setUserResults] = useState<AssignedEmployee[]>([]);
    const [showUserSuggestions, setShowUserSuggestions] = useState(false);

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

    const handleSubmit = async () => {
        if (!formData.startLocation || !formData.endLocation || !formData.purpose) {
            Alert.alert('Error', 'Please fill in all required fields');
            return;
        }

        if (formData.endTime <= formData.startTime) {
            Alert.alert('Error', 'End time must be after start time');
            return;
        }

        setLoading(true);
        try {
            const requestBody = {
                token,
                start_location: formData.startLocation,
                end_location: formData.endLocation,
                start_time: formData.startTime.toISOString(),
                end_time: formData.endTime.toISOString(),
                purpose: formData.purpose,
                grace_period: parseInt(formData.gracePeriod) || 1,
                booked_for_id: formData.bookingFor?.employee_id,
                city: city,
            };

            const response = await fetch(`${BACKEND_URL}/manager/createBooking`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(requestBody),
            });

            const text = await response.text();
            if (text.trim().startsWith('{')) {
                const data = JSON.parse(text);
                if (response.ok) {
                    Alert.alert('Success', 'Booking created successfully!');
                    onBookingCreated();
                    resetForm();
                } else {
                    Alert.alert('Error', data.message || 'Failed to create booking');
                }
            } else {
                Alert.alert('Error', 'Invalid response from server');
            }
        } catch (error) {
            console.error('Error creating booking:', error);
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
                        {/* WhatsApp-style Header */}
                        <View style={styles.modalHeader}>
                            <View style={styles.headerLeft}>
                               <TouchableOpacity style={styles.backButton} onPress={onClose}>
                                    <View style={styles.backIcon}>
                                        <View style={styles.backArrow} />
                                        {/* <Text style={styles.backText}>Back</Text> */}
                                    </View>
                                </TouchableOpacity>
                                <View style={styles.headerTitleContainer}>
                                    <Text style={styles.modalTitle}>New Booking</Text>
                                    <Text style={styles.modalSubtitle}>Create a new trip booking</Text>
                                </View>
                            </View>
                            <TouchableOpacity style={styles.headerIconButton} onPress={onClose}>
                                <Ionicons name="close" size={22} color="#FFFFFF" />
                            </TouchableOpacity>
                        </View>

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
                                                setShowStartDatePicker(false);
                                                if (selectedDate) {
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
                                                setShowEndDatePicker(false);
                                                if (selectedDate) {
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
                                        <Text style={styles.optionalText}>(Optional)</Text>
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
                                    disabled={loading}
                                    activeOpacity={0.7}
                                >
                                    <Text style={styles.cancelButtonText}>Cancel</Text>
                                </TouchableOpacity>
                                
                                <TouchableOpacity
                                    style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                                    onPress={handleSubmit}
                                    disabled={loading}
                                    activeOpacity={0.7}
                                >
                                    {loading ? (
                                        <ActivityIndicator color="#FFFFFF" size="small" />
                                    ) : (
                                        <>
                                            <MaterialIcons name="check-circle-outline" size={20} color="#FFFFFF" />
                                            <Text style={styles.submitButtonText}>Create Booking</Text>
                                        </>
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

export default BookingModal;