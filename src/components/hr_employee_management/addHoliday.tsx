import React, { useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Alert,
    ActivityIndicator,
    StyleSheet,
    Platform,
    Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { WHATSAPP_COLORS } from './constants';
import { BACKEND_URL } from '../../config/config';
import { Header } from './header';
import alert from '../../utils/Alert';

interface AddHolidayProps {
    token: string;
    onBack: () => void;
}

const CITIES = [
    'Gurgaon',
    'Chennai',
    'Mumbai',
    'Bangalore',
    'Hyderabad',
    'Pune',
    'Noida',
];

const AddHoliday: React.FC<AddHolidayProps> = ({ token, onBack }) => {
    const [holidayName, setHolidayName] = useState('');
    const [description, setDescription] = useState('');
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showDateModal, setShowDateModal] = useState(false);
    const [selectedCities, setSelectedCities] = useState<string[]>([]);
    const [showCityModal, setShowCityModal] = useState(false);
    const [loading, setLoading] = useState(false);

    const toggleCity = (city: string) => {
        setSelectedCities(prev =>
            prev.includes(city) ? prev.filter(c => c !== city) : [...prev, city]
        );
    };

    const handleDateChange = (event: any, date?: Date) => {
        if (date) {
            setSelectedDate(date);
            if (Platform.OS === 'android') {
                setShowDatePicker(false);
            }
        }
    };

    const handleDatePickerDone = () => {
        setShowDateModal(false);
        setShowDatePicker(false);
    };

    const validateForm = (): boolean => {
        if (!holidayName.trim()) {
            alert('Validation Error', 'Please enter holiday name');
            return false;
        }
        if (selectedCities.length === 0) {
            alert('Validation Error', 'Please select at least one city');
            return false;
        }
        return true;
    };

    const handleAdd = async () => {
        if (!validateForm()) return;

        if (!token) {
            alert('Error', 'Authentication token is missing');
            return;
        }

        setLoading(true);
        try {
            const formattedDate = selectedDate.toISOString().split('T')[0];
            const requestBody = {
                token,
                name: holidayName.trim(),
                date: formattedDate,
                cities: selectedCities,
                description: description.trim() || undefined,
            };

            console.log('Add request:', requestBody);

            const response = await fetch(`${BACKEND_URL}/manager/HRaddHolidays`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
            });

            console.log('Add response status:', response.status);

            if (response.ok) {
                alert('Success', 'Holiday added successfully', [
                    { text: 'OK', onPress: onBack }
                ]);
            } else {
                const errorData = await response.json();
                console.error('Add error:', errorData);
                alert('Error', errorData.message || 'Failed to add holiday');
            }
        } catch (error) {
            console.error('Error adding holiday:', error);
            alert('Error', 'Network error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <ScrollView
                style={styles.scrollContainer}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.headerWrapper}>
                    <Header
                        title="Add Holiday"
                        subtitle="Create a new holiday entry"
                        onBack={onBack}
                        variant="details"
                    />
                </View>

                <View style={styles.formContainer}>
                    <View style={styles.formCard}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Holiday Name *</Text>
                            <TextInput
                                style={styles.input}
                                value={holidayName}
                                onChangeText={setHolidayName}
                                placeholder="Enter holiday name"
                                placeholderTextColor="#9ca3af"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Date *</Text>
                            <TouchableOpacity
                                style={styles.dateButton}
                                onPress={() => setShowDateModal(true)}
                            >
                                <Ionicons name="calendar-outline" size={20} color="#6b7280" />
                                <Text style={styles.dateButtonText}>
                                    {selectedDate.toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    })}
                                </Text>
                                <Ionicons name="chevron-down" size={20} color="#6b7280" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Cities *</Text>
                            <TouchableOpacity
                                style={styles.cityButton}
                                onPress={() => setShowCityModal(true)}
                            >
                                <View style={styles.cityButtonContent}>
                                    <Ionicons name="location-outline" size={20} color="#6b7280" />
                                    <Text style={[
                                        styles.cityButtonText,
                                        selectedCities.length === 0 && styles.placeholderText
                                    ]}>
                                        {selectedCities.length === 0
                                            ? 'Select cities'
                                            : `${selectedCities.length} ${selectedCities.length === 1 ? 'city' : 'cities'} selected`
                                        }
                                    </Text>
                                </View>
                                <Ionicons name="chevron-forward" size={20} color="#6b7280" />
                            </TouchableOpacity>
                            {selectedCities.length > 0 && (
                                <View style={styles.selectedCitiesContainer}>
                                    {selectedCities.map((city) => (
                                        <View key={city} style={styles.cityChip}>
                                            <Text style={styles.cityChipText}>{city}</Text>
                                            <TouchableOpacity onPress={() => toggleCity(city)}>
                                                <Ionicons name="close" size={16} color="#4338ca" />
                                            </TouchableOpacity>
                                        </View>
                                    ))}
                                </View>
                            )}
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Description (Optional)</Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                value={description}
                                onChangeText={setDescription}
                                placeholder="Enter description"
                                placeholderTextColor="#9ca3af"
                                multiline
                                numberOfLines={4}
                            />
                        </View>

                        <View style={styles.actionButtons}>
                            <TouchableOpacity
                                onPress={onBack}
                                style={styles.cancelButton}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={handleAdd}
                                style={[styles.addButton, loading && styles.disabledButton]}
                                disabled={loading}
                            >
                                {loading ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <>
                                        <Ionicons name="add" size={20} color="#fff" />
                                        <Text style={styles.addButtonText}>Add Holiday</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </ScrollView>

            <Modal
                visible={showDateModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowDateModal(false)}
            >
                <View style={styles.dateModalOverlay}>
                    <TouchableOpacity 
                        style={styles.dateModalBackground}
                        onPress={() => setShowDateModal(false)}
                        activeOpacity={1}
                    />
                    <View style={styles.dateModalContainer}>
                        <View style={styles.dateModalHeader}>
                            <TouchableOpacity onPress={() => setShowDateModal(false)}>
                                <Text style={styles.dateModalCloseText}>Cancel</Text>
                            </TouchableOpacity>
                            <Text style={styles.dateModalTitle}>Select Date</Text>
                            <TouchableOpacity onPress={handleDatePickerDone}>
                                <Text style={styles.dateModalDoneText}>Done</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={styles.datePickerContainer}>
                            <DateTimePicker
                                value={selectedDate}
                                mode="date"
                                display="spinner"
                                onChange={handleDateChange}
                                textColor="#111827"
                            />
                        </View>
                    </View>
                </View>
            </Modal>

            <Modal
                visible={showCityModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowCityModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select Cities</Text>
                            <TouchableOpacity onPress={() => setShowCityModal(false)}>
                                <Ionicons name="close" size={24} color="#6b7280" />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={styles.cityList}>
                            {CITIES.map((city) => (
                                <TouchableOpacity
                                    key={city}
                                    style={styles.cityItem}
                                    onPress={() => toggleCity(city)}
                                >
                                    <View style={styles.cityItemLeft}>
                                        <View style={[
                                            styles.checkbox,
                                            selectedCities.includes(city) && styles.checkboxSelected
                                        ]}>
                                            {selectedCities.includes(city) && (
                                                <Ionicons name="checkmark" size={16} color="#fff" />
                                            )}
                                        </View>
                                        <Text style={styles.cityItemText}>{city}</Text>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                        <View style={styles.modalFooter}>
                            <TouchableOpacity
                                style={styles.modalButton}
                                onPress={() => setShowCityModal(false)}
                            >
                                <Text style={styles.modalButtonText}>
                                    Done ({selectedCities.length} selected)
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#e7e6e5',
    },
    scrollContainer: {
        flex: 1,
    },
    headerWrapper: {
        position: 'relative',
    },
    formContainer: {
        padding: 20,
        paddingBottom: 40,
    },
    formCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#f9fafb',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 12,
        padding: 14,
        fontSize: 16,
        color: '#111827',
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
    },
    dateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f9fafb',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 12,
        padding: 14,
        gap: 10,
    },
    dateButtonText: {
        flex: 1,
        fontSize: 16,
        color: '#111827',
    },
    cityButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#f9fafb',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 12,
        padding: 14,
    },
    cityButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        flex: 1,
    },
    cityButtonText: {
        fontSize: 16,
        color: '#111827',
    },
    placeholderText: {
        color: '#9ca3af',
    },
    selectedCitiesContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 12,
    },
    cityChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#e0e7ff',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 20,
        gap: 6,
    },
    cityChipText: {
        fontSize: 14,
        color: '#4338ca',
        fontWeight: '500',
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 10,
    },
    cancelButton: {
        flex: 1,
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f3f4f6',
    },
    cancelButtonText: {
        color: '#374151',
        fontSize: 16,
        fontWeight: '600',
    },
    addButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#3b82f6',
        padding: 16,
        borderRadius: 12,
        gap: 8,
    },
    disabledButton: {
        backgroundColor: '#9ca3af',
    },
    addButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    dateModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    dateModalBackground: {
        flex: 1,
    },
    dateModalContainer: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingBottom: 20,
    },
    dateModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    dateModalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111827',
    },
    dateModalCloseText: {
        fontSize: 16,
        color: '#ef4444',
        fontWeight: '600',
    },
    dateModalDoneText: {
        fontSize: 16,
        color: '#3b82f6',
        fontWeight: '600',
    },
    datePickerContainer: {
        paddingVertical: 10,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContainer: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111827',
    },
    cityList: {
        maxHeight: 400,
    },
    cityItem: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    cityItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: '#d1d5db',
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkboxSelected: {
        backgroundColor: '#10b981',
        borderColor: '#10b981',
    },
    cityItemText: {
        fontSize: 16,
        color: '#374151',
    },
    modalFooter: {
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
    },
    modalButton: {
        backgroundColor: '#10b981',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    modalButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});

export default AddHoliday;