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
    FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const FULL_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

const getDaysInMonth = (month: number, year: number) =>
    new Date(year, month + 1, 0).getDate();

const AddHoliday: React.FC<AddHolidayProps> = ({ token, onBack }) => {
    const today = new Date();

    const [holidayName, setHolidayName] = useState('');
    const [description, setDescription] = useState('');
    const [selectedCities, setSelectedCities] = useState<string[]>([]);
    const [showCityModal, setShowCityModal] = useState(false);
    const [loading, setLoading] = useState(false);

    // Committed date values (shown on the button)
    const [selectedDay, setSelectedDay] = useState(today.getDate());
    const [selectedMonth, setSelectedMonth] = useState(today.getMonth());
    const [selectedYear, setSelectedYear] = useState(today.getFullYear());

    // Temp date values (used while picker modal is open, discarded on Cancel)
    const [tempDay, setTempDay] = useState(today.getDate());
    const [tempMonth, setTempMonth] = useState(today.getMonth());
    const [tempYear, setTempYear] = useState(today.getFullYear());

    const [showDateModal, setShowDateModal] = useState(false);

    const currentYear = today.getFullYear();
    const years = Array.from({ length: 10 }, (_, i) => currentYear + i);

    // ─── Date picker helpers ────────────────────────────────────────────────

    const openDatePicker = () => {
        // Sync temp to current committed values before opening
        setTempDay(selectedDay);
        setTempMonth(selectedMonth);
        setTempYear(selectedYear);
        setShowDateModal(true);
    };

    const handleDatePickerDone = () => {
        // Clamp day if month/year changed (e.g. Jan 31 → Feb 28)
        const maxDay = getDaysInMonth(tempMonth, tempYear);
        setSelectedDay(Math.min(tempDay, maxDay));
        setSelectedMonth(tempMonth);
        setSelectedYear(tempYear);
        setShowDateModal(false);
    };

    const handleDatePickerCancel = () => {
        // Discard temp changes — committed values stay unchanged
        setShowDateModal(false);
    };

    const formatSelectedDate = () => {
        const safeDay = Math.min(selectedDay, getDaysInMonth(selectedMonth, selectedYear));
        return `${FULL_MONTHS[selectedMonth]} ${safeDay}, ${selectedYear}`;
    };

    const getFormattedDateForApi = () => {
        const safeDay = Math.min(selectedDay, getDaysInMonth(selectedMonth, selectedYear));
        const mm = String(selectedMonth + 1).padStart(2, '0');
        const dd = String(safeDay).padStart(2, '0');
        return `${selectedYear}-${mm}-${dd}`;
    };

    // ─── City helpers ───────────────────────────────────────────────────────

    const toggleCity = (city: string) => {
        setSelectedCities(prev =>
            prev.includes(city) ? prev.filter(c => c !== city) : [...prev, city]
        );
    };

    // ─── Validation & submit ────────────────────────────────────────────────

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
            const requestBody = {
                token,
                name: holidayName.trim(),
                date: getFormattedDateForApi(),
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

    // ─── Scroll-wheel picker column ─────────────────────────────────────────

    const ITEM_HEIGHT = 44;

    const PickerColumn = ({
        data,
        selectedValue,
        onSelect,
        labelFn,
    }: {
        data: number[];
        selectedValue: number;
        onSelect: (val: number) => void;
        labelFn?: (val: number) => string;
    }) => {
        const selectedIndex = data.indexOf(selectedValue);

        return (
            <FlatList
                data={data}
                keyExtractor={(item) => String(item)}
                showsVerticalScrollIndicator={false}
                snapToInterval={ITEM_HEIGHT}
                decelerationRate="fast"
                initialScrollIndex={Math.max(0, selectedIndex)}
                getItemLayout={(_, index) => ({
                    length: ITEM_HEIGHT,
                    offset: ITEM_HEIGHT * index,
                    index,
                })}
                onMomentumScrollEnd={(e) => {
                    const index = Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT);
                    const clamped = Math.max(0, Math.min(index, data.length - 1));
                    onSelect(data[clamped]);
                }}
                contentContainerStyle={{ paddingVertical: ITEM_HEIGHT }}
                style={{ height: ITEM_HEIGHT * 3, flex: 1 }}
                renderItem={({ item }) => {
                    const isSelected = item === selectedValue;
                    return (
                        <TouchableOpacity
                            onPress={() => onSelect(item)}
                            style={[pickerStyles.pickerItem, { height: ITEM_HEIGHT }]}
                        >
                            <Text style={[
                                pickerStyles.pickerItemText,
                                isSelected && pickerStyles.pickerItemTextSelected,
                            ]}>
                                {labelFn ? labelFn(item) : String(item)}
                            </Text>
                        </TouchableOpacity>
                    );
                }}
            />
        );
    };

    const days = Array.from({ length: getDaysInMonth(tempMonth, tempYear) }, (_, i) => i + 1);
    const months = Array.from({ length: 12 }, (_, i) => i);

    // ─── Render ─────────────────────────────────────────────────────────────

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

                        {/* Holiday Name */}
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

                        {/* Date */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Date *</Text>
                            <TouchableOpacity
                                style={styles.dateButton}
                                onPress={openDatePicker}
                                activeOpacity={0.8}
                            >
                                <Ionicons name="calendar-outline" size={20} color="#6b7280" />
                                <Text style={styles.dateButtonText}>
                                    {formatSelectedDate()}
                                </Text>
                                <Ionicons name="chevron-down" size={20} color="#6b7280" />
                            </TouchableOpacity>
                        </View>

                        {/* Cities */}
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

                        {/* Description */}
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

                        {/* Action buttons */}
                        <View style={styles.actionButtons}>
                            <TouchableOpacity onPress={onBack} style={styles.cancelButton}>
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

            {/* ── Custom Date Picker Modal ─────────────────────────────────────── */}
            <Modal
                visible={showDateModal}
                animationType="fade"
                transparent={true}
                onRequestClose={handleDatePickerCancel}
                statusBarTranslucent
            >
                <View style={styles.dateModalOverlay}>
                    {/* Tap backdrop = cancel */}
                    <TouchableOpacity
                        style={styles.dateModalBackground}
                        onPress={handleDatePickerCancel}
                        activeOpacity={1}
                    />

                    <View style={styles.dateModalContainer}>
                        {/* Header row */}
                        <View style={styles.dateModalHeader}>
                            <TouchableOpacity
                                onPress={handleDatePickerCancel}
                                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                            >
                                <Text style={styles.dateModalCloseText}>Cancel</Text>
                            </TouchableOpacity>
                            <Text style={styles.dateModalTitle}>Select Date</Text>
                            <TouchableOpacity
                                onPress={handleDatePickerDone}
                                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                            >
                                <Text style={styles.dateModalDoneText}>Done</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Column labels */}
                        <View style={styles.pickerColumnHeaders}>
                            <Text style={styles.pickerColumnLabel}>Day</Text>
                            <Text style={styles.pickerColumnLabel}>Month</Text>
                            <Text style={styles.pickerColumnLabel}>Year</Text>
                        </View>

                        {/* Scroll-wheel columns */}
                        <View style={styles.pickerWrapper}>
                            {/* Highlight band behind the selected row */}
                            <View style={styles.selectionHighlight} pointerEvents="none" />

                            <PickerColumn
                                data={days}
                                selectedValue={tempDay}
                                onSelect={setTempDay}
                            />
                            <PickerColumn
                                data={months}
                                selectedValue={tempMonth}
                                onSelect={setTempMonth}
                                labelFn={(v) => SHORT_MONTHS[v]}
                            />
                            <PickerColumn
                                data={years}
                                selectedValue={tempYear}
                                onSelect={setTempYear}
                            />
                        </View>
                    </View>
                </View>
            </Modal>

            {/* ── City Picker Modal (unchanged) ────────────────────────────────── */}
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

// ─── Picker column styles ──────────────────────────────────────────────────
const pickerStyles = StyleSheet.create({
    pickerItem: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    pickerItemText: {
        fontSize: 18,
        color: '#9ca3af',
        fontWeight: '400',
    },
    pickerItemTextSelected: {
        fontSize: 20,
        color: '#111827',
        fontWeight: '700',
    },
});

// ─── Main styles ───────────────────────────────────────────────────────────
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

    // Date modal
    dateModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    dateModalBackground: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
    },
    dateModalContainer: {
        backgroundColor: '#fff',
        borderRadius: 20,
        width: '100%',
        maxWidth: 340,
        paddingBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
        elevation: 10,
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
    pickerColumnHeaders: {
        flexDirection: 'row',
        paddingHorizontal: 12,
        paddingTop: 12,
        paddingBottom: 4,
    },
    pickerColumnLabel: {
        flex: 1,
        textAlign: 'center',
        fontSize: 11,
        fontWeight: '600',
        color: '#9ca3af',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    pickerWrapper: {
        flexDirection: 'row',
        paddingHorizontal: 12,
        position: 'relative',
        alignItems: 'center',
    },
    selectionHighlight: {
        position: 'absolute',
        left: 12,
        right: 12,
        top: '50%',
        marginTop: -22,
        height: 44,
        backgroundColor: '#eff6ff',
        borderRadius: 10,
        zIndex: 0,
    },

    // City modal (unchanged from original)
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