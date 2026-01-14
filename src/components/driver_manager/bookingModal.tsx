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
                        <View style={styles.modalHeader}>
                            <TouchableOpacity style={styles.modalCloseButton} onPress={onClose}>
                                <Ionicons name="close" size={24} color="#075E54" />
                            </TouchableOpacity>
                            <Text style={styles.modalTitle}>Create Booking</Text>
                            <View style={{ width: 40 }} />
                        </View>

                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={styles.modalScrollContent}
                            keyboardShouldPersistTaps="handled"
                        >
                            <View style={styles.formGroup}>
                                <Text style={styles.formLabel}>Start Location *</Text>
                                <View style={styles.inputContainer}>
                                    <MaterialCommunityIcons
                                        name="map-marker"
                                        size={20}
                                        color="#075E54"
                                        style={styles.inputIcon}
                                    />
                                    <TextInput
                                        style={styles.textInput}
                                        value={formData.startLocation}
                                        onChangeText={(text) => setFormData({ ...formData, startLocation: text })}
                                        placeholder="Enter pickup location"
                                        placeholderTextColor="#888"
                                    />
                                </View>
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.formLabel}>End Location *</Text>
                                <View style={styles.inputContainer}>
                                    <MaterialCommunityIcons
                                        name="map-marker-check"
                                        size={20}
                                        color="#075E54"
                                        style={styles.inputIcon}
                                    />
                                    <TextInput
                                        style={styles.textInput}
                                        value={formData.endLocation}
                                        onChangeText={(text) => setFormData({ ...formData, endLocation: text })}
                                        placeholder="Enter drop location"
                                        placeholderTextColor="#888"
                                    />
                                </View>
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.formLabel}>Start Date & Time *</Text>
                                <TouchableOpacity
                                    style={styles.dateTimeInput}
                                    onPress={() => setShowStartDatePicker(true)}
                                >
                                    <MaterialIcons name="date-range" size={20} color="#075E54" />
                                    <Text style={styles.dateTimeText}>
                                        {formatDateTime(formData.startTime)}
                                    </Text>
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
                                <Text style={styles.formLabel}>End Date & Time *</Text>
                                <TouchableOpacity
                                    style={styles.dateTimeInput}
                                    onPress={() => setShowEndDatePicker(true)}
                                >
                                    <MaterialIcons name="date-range" size={20} color="#075E54" />
                                    <Text style={styles.dateTimeText}>
                                        {formatDateTime(formData.endTime)}
                                    </Text>
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

                            <View style={styles.formGroup}>
                                <Text style={styles.formLabel}>Purpose *</Text>
                                <View style={styles.inputContainer}>
                                    <MaterialCommunityIcons
                                        name="information"
                                        size={20}
                                        color="#075E54"
                                        style={styles.inputIcon}
                                    />
                                    <TextInput
                                        style={[styles.textInput, { minHeight: 80 }]}
                                        value={formData.purpose}
                                        onChangeText={(text) => setFormData({ ...formData, purpose: text })}
                                        placeholder="Enter purpose of trip"
                                        placeholderTextColor="#888"
                                        multiline
                                        numberOfLines={3}
                                        textAlignVertical="top"
                                    />
                                </View>
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.formLabel}>Grace Period (hours)</Text>
                                <View style={styles.inputContainer}>
                                    <MaterialCommunityIcons
                                        name="timer"
                                        size={20}
                                        color="#075E54"
                                        style={styles.inputIcon}
                                    />
                                    <TextInput
                                        style={styles.textInput}
                                        value={formData.gracePeriod}
                                        onChangeText={(text) => setFormData({ ...formData, gracePeriod: text })}
                                        placeholder="1"
                                        placeholderTextColor="#888"
                                        keyboardType="numeric"
                                    />
                                </View>
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.formLabel}>Book For (Optional)</Text>
                                {formData.bookingFor ? (
                                    <View style={styles.selectedUser}>
                                        <View style={styles.userAvatar}>
                                            <Text style={styles.userAvatarText}>
                                                {formData.bookingFor.full_name.split(' ').map(n => n[0]).join('')}
                                            </Text>
                                        </View>
                                        <View style={styles.userInfo}>
                                            <Text style={styles.userName}>{formData.bookingFor.full_name}</Text>
                                            <Text style={styles.userEmail}>{formData.bookingFor.email}</Text>
                                        </View>
                                        <TouchableOpacity
                                            onPress={() => setFormData({ ...formData, bookingFor: null })}
                                        >
                                            <MaterialIcons name="close" size={24} color="#FF3B30" />
                                        </TouchableOpacity>
                                    </View>
                                ) : (
                                    <>
                                        <TouchableOpacity
                                            style={styles.searchButton}
                                            onPress={() => setShowUserSuggestions(!showUserSuggestions)}
                                        >
                                            <MaterialIcons name="person-search" size={20} color="#075E54" />
                                            <Text style={styles.searchButtonText}>Search employee</Text>
                                        </TouchableOpacity>
                                        {showUserSuggestions && (
                                            <View style={styles.searchContainer}>
                                                <TextInput
                                                    style={styles.searchInput}
                                                    placeholder="Search by name or email"
                                                    value={userSearchQuery}
                                                    onChangeText={setUserSearchQuery}
                                                    placeholderTextColor="#888"
                                                />
                                                {userResults.length > 0 && (
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
                                                            </TouchableOpacity>
                                                        ))}
                                                    </ScrollView>
                                                )}
                                            </View>
                                        )}
                                    </>
                                )}
                            </View>

                            <View style={styles.modalButtons}>
                                <TouchableOpacity
                                    style={styles.modalCancelButton}
                                    onPress={onClose}
                                    disabled={loading}
                                >
                                    <Text style={styles.modalCancelText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.modalSubmitButton, loading && styles.modalSubmitButtonDisabled]}
                                    onPress={handleSubmit}
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <ActivityIndicator color="#FFFFFF" size="small" />
                                    ) : (
                                        <Text style={styles.modalSubmitText}>Create Booking</Text>
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