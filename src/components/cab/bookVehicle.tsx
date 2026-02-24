// bookVehicle.tsx
import React, { useState, useRef, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    TextInput, ActivityIndicator, Modal, KeyboardAvoidingView,
    Platform, Alert, Pressable
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { BookingFormData, AssignedEmployee, Vehicle, BookVehicleModalProps } from './types';
import { formatTimeForDisplay, formatDateForDisplay } from './utils';
import { BACKEND_URL } from '../../config/config';

// ─── Date/Time Picker Row ────────────────────────────────────────────────────
interface DateTimeRowProps {
    label: string;
    accentColor: string;
    date: Date;
    time: Date;
    onPressDate: () => void;
    onPressTime: () => void;
}
const DateTimeRow: React.FC<DateTimeRowProps> = ({
    label, accentColor, date, time, onPressDate, onPressTime
}) => (
    <View style={dtStyles.container}>
        <Text style={dtStyles.label}>{label}</Text>
        <View style={dtStyles.row}>
            <TouchableOpacity style={[dtStyles.btn, { borderColor: accentColor + '40' }]} onPress={onPressDate}>
                <MaterialCommunityIcons name="calendar" size={18} color={accentColor} />
                <Text style={dtStyles.btnText}>{formatDateForDisplay(date)}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[dtStyles.btn, { borderColor: accentColor + '40' }]} onPress={onPressTime}>
                <MaterialCommunityIcons name="clock-outline" size={18} color={accentColor} />
                <Text style={dtStyles.btnText}>{formatTimeForDisplay(time)}</Text>
            </TouchableOpacity>
        </View>
    </View>
);

const dtStyles = StyleSheet.create({
    container: { marginBottom: 16 },
    label: { fontSize: 13, fontWeight: '500', color: '#555', marginBottom: 8 },
    row: { flexDirection: 'row', gap: 10 },
    btn: {
        flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: '#fff', borderWidth: 1.5, borderRadius: 12,
        paddingHorizontal: 12, paddingVertical: 11,
    },
    btnText: { fontSize: 13, color: '#333', fontWeight: '500' },
});

// ─── iOS Picker Sheet (rendered INSIDE the main modal) ──────────────────────
interface IOSPickerSheetProps {
    visible: boolean;
    mode: 'date' | 'time';
    value: Date;
    minimumDate?: Date;
    title: string;
    accentColor: string;
    onCancel: () => void;
    onConfirm: (date: Date) => void;
}

const IOSPickerSheet: React.FC<IOSPickerSheetProps> = ({
    visible, mode, value, minimumDate, title, accentColor, onCancel, onConfirm
}) => {
    const [tempDate, setTempDate] = useState<Date>(value);

    // Sync tempDate whenever the picker opens or the incoming value changes
    useEffect(() => {
        setTempDate(value);
    }, [value, visible]);

    if (!visible) return null;

    return (
        // Full-screen overlay rendered inside the parent modal
        <Pressable style={sheetStyles.overlay} onPress={onCancel}>
            <Pressable style={sheetStyles.sheet} onPress={() => { /* absorb tap */ }}>
                {/* Drag handle */}
                <View style={sheetStyles.handle} />

                {/* Header */}
                <View style={sheetStyles.header}>
                    <TouchableOpacity onPress={onCancel} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <Text style={sheetStyles.cancelBtn}>Cancel</Text>
                    </TouchableOpacity>
                    <Text style={sheetStyles.title}>{title}</Text>
                    <TouchableOpacity
                        onPress={() => onConfirm(tempDate)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Text style={[sheetStyles.doneBtn, { color: accentColor }]}>Done</Text>
                    </TouchableOpacity>
                </View>

                {/* Divider */}
                <View style={sheetStyles.divider} />

                {/* Picker */}
                <DateTimePicker
                    value={tempDate}
                    mode={mode}
                    display="spinner"
                    minimumDate={minimumDate}
                    onChange={(_event, selectedDate) => {
                        if (selectedDate) {
                            setTempDate(selectedDate);
                        }
                    }}
                    style={sheetStyles.picker}
                    textColor="#1a1a1a"
                    locale="en-US"
                />

                {/* Quick presets for date mode */}
                {mode === 'date' && (
                    <View style={sheetStyles.presetRow}>
                        {['Today', 'Tomorrow', 'Next Week'].map((label, i) => {
                            const d = new Date();
                            if (i === 1) d.setDate(d.getDate() + 1);
                            if (i === 2) d.setDate(d.getDate() + 7);
                            return (
                                <TouchableOpacity
                                    key={label}
                                    style={[sheetStyles.presetChip, { borderColor: accentColor + '50' }]}
                                    onPress={() => setTempDate(d)}
                                >
                                    <Text style={[sheetStyles.presetText, { color: accentColor }]}>{label}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                )}

                {/* Confirm button */}
                <TouchableOpacity
                    style={[sheetStyles.confirmButton, { backgroundColor: accentColor }]}
                    onPress={() => onConfirm(tempDate)}
                    activeOpacity={0.85}
                >
                    <MaterialCommunityIcons
                        name={mode === 'date' ? 'calendar-check' : 'clock-check-outline'}
                        size={18}
                        color="#fff"
                    />
                    <Text style={sheetStyles.confirmButtonText}>
                        Confirm {mode === 'date' ? 'Date' : 'Time'}
                    </Text>
                </TouchableOpacity>

                <View style={sheetStyles.safeAreaBottom} />
            </Pressable>
        </Pressable>
    );
};

const sheetStyles = StyleSheet.create({
    overlay: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'flex-end',
        zIndex: 9999,
    },
    sheet: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingTop: 10,
        paddingHorizontal: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 20,
    },
    handle: {
        width: 36, height: 4, borderRadius: 2,
        backgroundColor: '#ddd', alignSelf: 'center', marginBottom: 14,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    title: {
        fontSize: 17,
        fontWeight: '700',
        color: '#1a1a1a',
        letterSpacing: -0.3,
    },
    cancelBtn: {
        fontSize: 16,
        color: '#999',
        fontWeight: '500',
    },
    doneBtn: {
        fontSize: 16,
        fontWeight: '700',
    },
    divider: {
        height: 1,
        backgroundColor: '#f0f0f0',
        marginBottom: 4,
    },
    picker: {
        height: 200,
        width: '100%',
    },
    presetRow: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 4,
        marginBottom: 8,
    },
    presetChip: {
        flex: 1,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1.5,
        alignItems: 'center',
    },
    presetText: {
        fontSize: 12,
        fontWeight: '600',
    },
    confirmButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 15,
        borderRadius: 14,
        marginTop: 8,
    },
    confirmButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    safeAreaBottom: { height: 24 },
});

// ─── Main Modal ──────────────────────────────────────────────────────────────
type ActivePicker = 'startDate' | 'startTime' | 'endDate' | 'endTime' | null;

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
    const [activePicker, setActivePicker] = useState<ActivePicker>(null);
    const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        return () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current); };
    }, []);

    // Reset state when modal closes
    useEffect(() => {
        if (!visible) {
            setActivePicker(null);
            setLocalSearchQuery('');
            setLocalUserResults([]);
            setShowUserSearch(false);
        }
    }, [visible]);

    const searchPeople = async (query: string) => {
        if (query.length < 2) { setLocalUserResults([]); return; }
        setSearchLoading(true);
        try {
            const response = await fetch(
                `${BACKEND_URL}/core/getPeople?query=${encodeURIComponent(query)}`,
                { method: 'GET', headers: { 'Content-Type': 'application/json' } }
            );
            if (response.ok) {
                const data = await response.json();
                setLocalUserResults(data.users || []);
            } else {
                setLocalUserResults([]);
            }
        } catch {
            setLocalUserResults([]);
        } finally {
            setSearchLoading(false);
        }
    };

    const handleSearchChange = (text: string) => {
        setLocalSearchQuery(text);
        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        if (text.length >= 2) {
            searchTimeoutRef.current = setTimeout(() => searchPeople(text), 400);
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
        if (bookingForm.bookingFor) {
            handleRemoveUser();
        } else {
            setShowUserSearch(!showUserSearch);
        }
    };

    // Picker helpers
    const getPickerValue = (): Date => {
        switch (activePicker) {
            case 'startDate': return bookingForm.startDate;
            case 'startTime': return bookingForm.startTime;
            case 'endDate': return bookingForm.endDate;
            case 'endTime': return bookingForm.endTime;
            default: return new Date();
        }
    };

    const getPickerMode = (): 'date' | 'time' =>
        activePicker === 'startDate' || activePicker === 'endDate' ? 'date' : 'time';

    const getPickerTitle = (): string => {
        switch (activePicker) {
            case 'startDate': return 'Select Start Date';
            case 'startTime': return 'Select Start Time';
            case 'endDate': return 'Select End Date';
            case 'endTime': return 'Select End Time';
            default: return 'Select';
        }
    };

    const getPickerAccent = (): string => {
        switch (activePicker) {
            case 'startDate':
            case 'startTime':
                return '#00d285';
            case 'endDate':
            case 'endTime':
                return '#ff5e7a';
            default:
                return '#00d285';
        }
    };

    const applyPickerValue = (date: Date) => {
        if (!activePicker) return;
        setBookingForm({ ...bookingForm, [activePicker]: date });
        setActivePicker(null);
    };

    const handleAndroidPickerChange = (_: any, selectedDate?: Date) => {
        if (selectedDate && activePicker) {
            setBookingForm({ ...bookingForm, [activePicker]: selectedDate });
        }
        setActivePicker(null);
    };

    const vehiclesWithoutDrivers = selectedVehicles.filter(sv => !sv.driver);
    const canProceed =
        bookingForm.purpose.trim().length > 0 &&
        bookingForm.fromLocation.trim().length > 0 &&
        bookingForm.toLocation.trim().length > 0;

    return (
        <>
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
                            {/* Header */}
                            <View style={styles.modalHeader}>
                                <View>
                                    <Text style={styles.modalTitle}>Confirm Booking</Text>
                                    <Text style={styles.modalSubtitle}>
                                        {selectedVehicles.length} vehicle{selectedVehicles.length !== 1 ? 's' : ''} selected
                                    </Text>
                                </View>
                                <TouchableOpacity style={styles.modalClose} onPress={onClose}>
                                    <MaterialCommunityIcons name="close" size={24} color="#333" />
                                </TouchableOpacity>
                            </View>

                            <ScrollView
                                style={styles.modalScroll}
                                showsVerticalScrollIndicator={false}
                                keyboardShouldPersistTaps="handled"
                            >
                                {/* ── Vehicle Summary ── */}
                                <View style={styles.section}>
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
                                    {vehiclesWithoutDrivers.length > 0 && (
                                        <View style={styles.warningBox}>
                                            <MaterialCommunityIcons name="alert-circle-outline" size={18} color="#ffb157" />
                                            <Text style={styles.warningText}>
                                                {vehiclesWithoutDrivers.length} vehicle{vehiclesWithoutDrivers.length !== 1 ? 's' : ''} without driver — will be assigned later
                                            </Text>
                                        </View>
                                    )}
                                </View>

                                {/* ── Trip Route ── */}
                                <View style={styles.section}>
                                    <Text style={styles.sectionTitle}>Trip Route</Text>
                                    <View style={styles.routeCard}>
                                        <View style={styles.routeRow}>
                                            <View style={[styles.routeDot, { backgroundColor: '#00d285' }]} />
                                            <View style={styles.routeInputWrapper}>
                                                <Text style={styles.routeLabel}>Pickup Location</Text>
                                                <TextInput
                                                    style={styles.routeInput}
                                                    value={bookingForm.fromLocation}
                                                    onChangeText={t => setBookingForm({ ...bookingForm, fromLocation: t })}
                                                    placeholder="Enter pickup address"
                                                    placeholderTextColor="#bbb"
                                                />
                                            </View>
                                        </View>
                                        <View style={styles.routeDivider} />
                                        <View style={styles.routeRow}>
                                            <View style={[styles.routeDot, { backgroundColor: '#ff5e7a' }]} />
                                            <View style={styles.routeInputWrapper}>
                                                <Text style={styles.routeLabel}>Drop-off Location</Text>
                                                <TextInput
                                                    style={styles.routeInput}
                                                    value={bookingForm.toLocation}
                                                    onChangeText={t => setBookingForm({ ...bookingForm, toLocation: t })}
                                                    placeholder="Enter destination address"
                                                    placeholderTextColor="#bbb"
                                                />
                                            </View>
                                        </View>
                                    </View>
                                </View>

                                {/* ── Schedule ── */}
                                <View style={styles.section}>
                                    <Text style={styles.sectionTitle}>Schedule</Text>
                                    <View style={styles.scheduleCard}>
                                        <DateTimeRow
                                            label="🟢  Pickup Date & Time"
                                            accentColor="#00d285"
                                            date={bookingForm.startDate}
                                            time={bookingForm.startTime}
                                            onPressDate={() => setActivePicker('startDate')}
                                            onPressTime={() => setActivePicker('startTime')}
                                        />
                                        <DateTimeRow
                                            label="🔴  Drop-off Date & Time"
                                            accentColor="#ff5e7a"
                                            date={bookingForm.endDate}
                                            time={bookingForm.endTime}
                                            onPressDate={() => setActivePicker('endDate')}
                                            onPressTime={() => setActivePicker('endTime')}
                                        />
                                        <View style={styles.formGroup}>
                                            <Text style={styles.formLabel}>Grace Period (hours)</Text>
                                            <TextInput
                                                style={styles.formInput}
                                                value={bookingForm.gracePeriod}
                                                onChangeText={t => setBookingForm({ ...bookingForm, gracePeriod: t })}
                                                placeholder="1"
                                                placeholderTextColor="#bbb"
                                                keyboardType="numeric"
                                            />
                                            <Text style={styles.helperText}>Buffer time for unexpected delays</Text>
                                        </View>
                                    </View>
                                </View>

                                {/* ── Purpose ── */}
                                <View style={styles.section}>
                                    <Text style={styles.sectionTitle}>Purpose</Text>
                                    <TextInput
                                        style={[styles.formInput, styles.textArea]}
                                        value={bookingForm.purpose}
                                        onChangeText={t => setBookingForm({ ...bookingForm, purpose: t })}
                                        placeholder="e.g., Client meeting, Site visit, Airport pickup"
                                        placeholderTextColor="#bbb"
                                        multiline
                                        numberOfLines={3}
                                    />
                                    <Text style={styles.requiredNote}>* Required</Text>
                                </View>

                                {/* ── Booking For Someone Else ── */}
                                <View style={[styles.section, { marginBottom: 8 }]}>
                                    <TouchableOpacity
                                        style={styles.checkboxWrapper}
                                        onPress={handleCheckboxPress}
                                        activeOpacity={0.7}
                                    >
                                        <MaterialCommunityIcons
                                            name={bookingForm.bookingFor ? 'checkbox-marked' : 'checkbox-blank-outline'}
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
                                                placeholderTextColor="#bbb"
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
                                                    {localUserResults.map(user => (
                                                        <TouchableOpacity
                                                            key={user.employee_id}
                                                            style={styles.autocompleteItem}
                                                            onPress={() => handleSelectUser(user)}
                                                        >
                                                            <View style={styles.userAvatar}>
                                                                <Text style={styles.userAvatarText}>
                                                                    {user.full_name.split(' ').map((n: string) => n[0]).join('')}
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
                                                    {bookingForm.bookingFor.full_name.split(' ').map((n: string) => n[0]).join('')}
                                                </Text>
                                            </View>
                                            <View style={styles.selectedPersonInfo}>
                                                <Text style={styles.selectedPersonName}>{bookingForm.bookingFor.full_name}</Text>
                                                <Text style={styles.selectedPersonDetails}>
                                                    {bookingForm.bookingFor.employee_id} • {bookingForm.bookingFor.email}
                                                </Text>
                                            </View>
                                            <TouchableOpacity style={styles.removeBtn} onPress={handleRemoveUser}>
                                                <MaterialCommunityIcons name="close-circle" size={24} color="#ff5e7a" />
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                </View>

                                {/* ── Confirm Button ── */}
                                <TouchableOpacity
                                    style={[styles.confirmBtn, (!canProceed || loading) && styles.disabledBtn]}
                                    onPress={onBookVehicle}
                                    disabled={!canProceed || loading}
                                >
                                    {loading ? (
                                        <ActivityIndicator color="#fff" size="small" />
                                    ) : (
                                        <>
                                            <MaterialCommunityIcons name="check-circle" size={20} color="#fff" />
                                            <Text style={styles.confirmBtnText}>Book Now</Text>
                                        </>
                                    )}
                                </TouchableOpacity>

                                {!canProceed && (
                                    <Text style={styles.missingFieldsNote}>
                                        Please fill in pickup location, destination, and purpose to continue
                                    </Text>
                                )}

                                <View style={{ height: 30 }} />
                            </ScrollView>
                        </View>
                    </KeyboardAvoidingView>

                    {/* ── iOS Picker Sheet (inside the Modal so it stacks correctly) ── */}
                    {Platform.OS === 'ios' && (
                        <IOSPickerSheet
                            visible={activePicker !== null}
                            mode={getPickerMode()}
                            value={getPickerValue()}
                            minimumDate={
                                activePicker === 'startDate' || activePicker === 'endDate'
                                    ? new Date()
                                    : undefined
                            }
                            title={getPickerTitle()}
                            accentColor={getPickerAccent()}
                            onCancel={() => setActivePicker(null)}
                            onConfirm={applyPickerValue}
                        />
                    )}
                </View>
            </Modal>

            {/* Android Date/Time Picker — must be outside Modal */}
            {Platform.OS === 'android' && activePicker !== null && (
                <DateTimePicker
                    value={getPickerValue()}
                    mode={getPickerMode()}
                    display="default"
                    minimumDate={
                        activePicker === 'startDate' || activePicker === 'endDate'
                            ? new Date()
                            : undefined
                    }
                    onChange={(_, selectedDate?: Date) => {
                        if (selectedDate && activePicker) {
                            setBookingForm({ ...bookingForm, [activePicker]: selectedDate });
                        }
                        setActivePicker(null);
                    }}
                />
            )}
        </>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
    },
    keyboardAvoidingView: { flex: 1, justifyContent: 'flex-end' },
    modalContent: {
        backgroundColor: '#f5f5f5',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        maxHeight: '95%',
        paddingTop: 6,
    },
    modalHandle: {
        width: 40, height: 4, borderRadius: 2, backgroundColor: '#ddd',
        alignSelf: 'center', marginTop: 10, marginBottom: 4,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        backgroundColor: '#fff',
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
    },
    modalTitle: { fontSize: 22, color: '#333', fontWeight: '700' },
    modalSubtitle: { fontSize: 13, color: '#999', marginTop: 2 },
    modalClose: {
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: '#f5f5f5', alignItems: 'center', justifyContent: 'center',
    },
    modalScroll: { paddingHorizontal: 16, paddingTop: 16 },

    section: { marginBottom: 16 },
    sectionTitle: {
        fontSize: 14, fontWeight: '700', color: '#333',
        marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5,
    },

    vehicleItem: {
        flexDirection: 'row', backgroundColor: '#fff', padding: 14,
        borderRadius: 14, marginBottom: 8, alignItems: 'center', gap: 12,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
    },
    vehicleNumber: {
        width: 32, height: 32, borderRadius: 16, backgroundColor: '#008069',
        alignItems: 'center', justifyContent: 'center',
    },
    vehicleNumberText: { color: '#fff', fontWeight: '700', fontSize: 14 },
    vehicleInfo: { flex: 1 },
    vehicleName: { fontSize: 15, fontWeight: '600', color: '#333' },
    vehiclePlate: { fontSize: 12, color: '#666', marginTop: 2 },
    driverTag: { flexDirection: 'row', alignItems: 'center', marginTop: 5, gap: 4 },
    driverTagText: { fontSize: 12, color: '#00d285', fontWeight: '500' },
    warningBox: {
        flexDirection: 'row', alignItems: 'flex-start', gap: 8,
        backgroundColor: 'rgba(255,177,87,0.1)', padding: 12,
        borderRadius: 10, borderLeftWidth: 3, borderLeftColor: '#ffb157', marginTop: 4,
    },
    warningText: { fontSize: 12, color: '#c47a00', flex: 1, lineHeight: 18 },

    routeCard: {
        backgroundColor: '#fff', borderRadius: 16, padding: 16,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05, shadowRadius: 6, elevation: 1,
    },
    routeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    routeDot: { width: 12, height: 12, borderRadius: 6, marginTop: 18 },
    routeDivider: {
        width: 2, height: 20, backgroundColor: '#e0e0e0',
        marginLeft: 5, marginVertical: 4,
    },
    routeInputWrapper: { flex: 1 },
    routeLabel: { fontSize: 11, color: '#999', fontWeight: '600', marginBottom: 4, textTransform: 'uppercase' },
    routeInput: {
        borderBottomWidth: 1.5, borderBottomColor: '#e0e0e0',
        paddingBottom: 8, fontSize: 15, color: '#333', paddingTop: 2,
    },

    scheduleCard: {
        backgroundColor: '#fff', borderRadius: 16, padding: 16,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05, shadowRadius: 6, elevation: 1,
    },

    formGroup: { marginBottom: 4 },
    formLabel: { fontSize: 13, fontWeight: '500', color: '#555', marginBottom: 8 },
    formInput: {
        backgroundColor: '#f9f9f9', borderWidth: 1.5, borderColor: '#e8e8e8',
        borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11,
        fontSize: 15, color: '#333',
    },
    textArea: { minHeight: 80, textAlignVertical: 'top' },
    helperText: { fontSize: 11, color: '#aaa', marginTop: 6 },
    requiredNote: { fontSize: 11, color: '#aaa', marginTop: 4 },

    checkboxWrapper: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        backgroundColor: '#fff', paddingVertical: 14, paddingHorizontal: 16,
        borderRadius: 14,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
    },
    checkboxLabel: { fontSize: 15, color: '#333', fontWeight: '500' },
    searchPanel: {
        marginTop: 12, backgroundColor: '#fff', borderRadius: 14, padding: 14,
        borderWidth: 1, borderColor: '#e8e8e8',
    },
    searchInput: {
        backgroundColor: '#f9f9f9', borderWidth: 1, borderColor: '#e0e0e0',
        borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11,
        fontSize: 15, color: '#333',
    },
    selectedPerson: {
        flexDirection: 'row', alignItems: 'center', marginTop: 12,
        backgroundColor: 'rgba(0,128,105,0.06)', paddingHorizontal: 15, paddingVertical: 12,
        borderRadius: 14, borderWidth: 1, borderColor: 'rgba(0,128,105,0.2)',
    },
    selectedPersonAvatar: {
        width: 40, height: 40, borderRadius: 20, backgroundColor: '#008069',
        alignItems: 'center', justifyContent: 'center', marginRight: 12,
    },
    selectedPersonAvatarText: { color: '#fff', fontWeight: '700', fontSize: 14 },
    selectedPersonInfo: { flex: 1 },
    selectedPersonName: { color: '#008069', fontWeight: '600', fontSize: 15 },
    selectedPersonDetails: { color: '#666', fontSize: 12, marginTop: 2 },
    removeBtn: { padding: 4 },
    loadingContainer: {
        flexDirection: 'row', alignItems: 'center', padding: 12,
        backgroundColor: '#f9f9f9', borderRadius: 10, marginTop: 8,
    },
    loadingText: { marginLeft: 10, color: '#666', fontSize: 14 },
    autocompleteList: {
        maxHeight: 200, backgroundColor: '#fff', borderWidth: 1,
        borderColor: '#e0e0e0', borderRadius: 10, marginTop: 8,
    },
    autocompleteItem: {
        padding: 12, flexDirection: 'row', alignItems: 'center',
        borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
    },
    userAvatar: {
        width: 36, height: 36, borderRadius: 18, backgroundColor: '#008069',
        alignItems: 'center', justifyContent: 'center', marginRight: 12,
    },
    userAvatarText: { color: '#fff', fontWeight: '600', fontSize: 13 },
    userInfo: { flex: 1 },
    userName: { fontWeight: '600', color: '#333', fontSize: 14 },
    userDetails: { fontSize: 12, color: '#666', marginTop: 2 },
    noResults: { padding: 24, backgroundColor: '#f9f9f9', borderRadius: 10, marginTop: 8, alignItems: 'center' },
    noResultsText: { color: '#666', fontSize: 14, marginTop: 8 },

    confirmBtn: {
        backgroundColor: '#00d285', padding: 17, borderRadius: 16,
        alignItems: 'center', flexDirection: 'row', justifyContent: 'center',
        gap: 8, marginTop: 8,
        shadowColor: '#00d285', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35, shadowRadius: 10, elevation: 6,
    },
    confirmBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
    disabledBtn: { opacity: 0.45, shadowOpacity: 0 },
    missingFieldsNote: { fontSize: 12, color: '#aaa', textAlign: 'center', marginTop: 8 },
});

export default BookVehicleModal;