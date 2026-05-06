// bookVehicle.tsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    TextInput, ActivityIndicator, Modal, KeyboardAvoidingView,
    Platform, Alert, Pressable, Keyboard
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

    useEffect(() => {
        setTempDate(value);
    }, [value, visible]);

    if (!visible) return null;

    return (
        <Pressable style={sheetStyles.overlay} onPress={onCancel}>
            <Pressable style={sheetStyles.sheet} onPress={() => { /* absorb tap */ }}>
                <View style={sheetStyles.handle} />
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
                <View style={sheetStyles.divider} />
                <DateTimePicker
                    value={tempDate}
                    mode={mode}
                    display="spinner"
                    minimumDate={minimumDate}
                    onChange={(_event, selectedDate) => {
                        if (selectedDate) setTempDate(selectedDate);
                    }}
                    style={sheetStyles.picker}
                    textColor="#1a1a1a"
                    locale="en-US"
                />
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
    title: { fontSize: 17, fontWeight: '700', color: '#1a1a1a', letterSpacing: -0.3 },
    cancelBtn: { fontSize: 16, color: '#999', fontWeight: '500' },
    doneBtn: { fontSize: 16, fontWeight: '700' },
    divider: { height: 1, backgroundColor: '#f0f0f0', marginBottom: 4 },
    picker: { height: 200, width: '100%' },
    presetRow: { flexDirection: 'row', gap: 8, marginTop: 4, marginBottom: 8 },
    presetChip: {
        flex: 1, paddingVertical: 8, borderRadius: 20,
        borderWidth: 1.5, alignItems: 'center',
    },
    presetText: { fontSize: 12, fontWeight: '600' },
    confirmButton: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 8, paddingVertical: 15, borderRadius: 14, marginTop: 8,
    },
    confirmButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    safeAreaBottom: { height: 24 },
});

// ─── Web Date/Time Picker ────────────────────────────────────────────────────
interface WebPickerModalProps {
    visible: boolean;
    mode: 'date' | 'time';
    value: Date;
    minimumDate?: Date;
    title: string;
    accentColor: string;
    onCancel: () => void;
    onConfirm: (date: Date) => void;
}

const toDateInputString = (d: Date): string =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const toTimeInputString = (d: Date): string =>
    `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

const WebPickerModal: React.FC<WebPickerModalProps> = ({
    visible, mode, value, minimumDate, title, accentColor, onCancel, onConfirm,
}) => {
    const [tempValue, setTempValue] = useState('');

    useEffect(() => {
        setTempValue(mode === 'date' ? toDateInputString(value) : toTimeInputString(value));
    }, [value, visible, mode]);

    if (!visible) return null;

    const handleConfirm = () => {
        if (!tempValue) { onCancel(); return; }
        const result = new Date(value);
        if (mode === 'date') {
            const [y, m, d] = tempValue.split('-').map(Number);
            result.setFullYear(y, m - 1, d);
        } else {
            const [h, min] = tempValue.split(':').map(Number);
            result.setHours(h, min, 0, 0);
        }
        onConfirm(result);
    };

    const minAttr =
        minimumDate && mode === 'date' ? toDateInputString(minimumDate) : undefined;

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
            <Pressable style={webPickerStyles.overlay} onPress={onCancel}>
                <Pressable style={webPickerStyles.card} onPress={() => { /* absorb */ }}>
                    {/* Header */}
                    <View style={sheetStyles.header}>
                        <TouchableOpacity
                            onPress={onCancel}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <Text style={sheetStyles.cancelBtn}>Cancel</Text>
                        </TouchableOpacity>
                        <Text style={sheetStyles.title}>{title}</Text>
                        <TouchableOpacity
                            onPress={handleConfirm}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <Text style={[sheetStyles.doneBtn, { color: accentColor }]}>Done</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={sheetStyles.divider} />

                    {/* Native HTML date / time input */}
                    <input
                        type={mode}
                        value={tempValue}
                        min={minAttr}
                        onChange={e => setTempValue(e.target.value)}
                        style={{
                            fontSize: 18,
                            padding: '12px 14px',
                            width: '100%',
                            marginTop: 20,
                            marginBottom: 20,
                            borderRadius: 12,
                            border: `1.5px solid ${accentColor}60`,
                            outline: 'none',
                            color: '#1a1a1a',
                            boxSizing: 'border-box',
                            accentColor,
                            cursor: 'pointer',
                            backgroundColor: '#f9f9f9',
                        } as React.CSSProperties}
                    />

                    {/* Preset date shortcuts — only for date mode */}
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
                                        onPress={() => setTempValue(toDateInputString(d))}
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
                        onPress={handleConfirm}
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
                </Pressable>
            </Pressable>
        </Modal>
    );
};

const webPickerStyles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 20,
        width: '100%',
        maxWidth: 420,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.18,
        shadowRadius: 20,
        elevation: 20,
    },
});

// ─── Cab Sharing Section ──────────────────────────────────────────────────────
interface CabSharingSectionProps {
    sharingWith: AssignedEmployee[];
    onAdd: (user: AssignedEmployee) => void;
    onRemove: (employeeId: string) => void;
    excludeEmployeeIds?: string[];
}

const CabSharingSection: React.FC<CabSharingSectionProps> = ({
    sharingWith,
    onAdd,
    onRemove,
    excludeEmployeeIds = [],
}) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<AssignedEmployee[]>([]);
    const [searching, setSearching] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    }, []);

    const searchUsers = useCallback(async (text: string) => {
        if (text.length < 2) {
            setResults([]);
            setShowDropdown(false);
            return;
        }
        setSearching(true);
        try {
            const response = await fetch(
                `${BACKEND_URL}/core/getPeople?query=${encodeURIComponent(text)}`,
                { method: 'GET', headers: { 'Content-Type': 'application/json' } }
            );
            if (response.ok) {
                const data = await response.json();
                const allUsers: AssignedEmployee[] = data.users || [];
                const alreadySelectedIds = new Set(sharingWith.map(u => u.employee_id));
                const excludeSet = new Set(excludeEmployeeIds);
                const filtered = allUsers.filter(
                    u => !alreadySelectedIds.has(u.employee_id) && !excludeSet.has(u.employee_id)
                );
                setResults(filtered);
                setShowDropdown(true);
            } else {
                setResults([]);
            }
        } catch {
            setResults([]);
        } finally {
            setSearching(false);
        }
    }, [sharingWith, excludeEmployeeIds]);

    const handleQueryChange = (text: string) => {
        setQuery(text);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (text.length >= 2) {
            debounceRef.current = setTimeout(() => searchUsers(text), 400);
        } else {
            setResults([]);
            setShowDropdown(false);
        }
    };

    const handleSelect = (user: AssignedEmployee) => {
        onAdd(user);
        setQuery('');
        setResults([]);
        setShowDropdown(false);
    };

    const getInitials = (name: string) =>
        name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

    return (
        <View style={sharingStyles.container}>
            {/* Section header */}
            <View style={sharingStyles.headerRow}>
                <MaterialCommunityIcons name="account-multiple-plus" size={16} color="#008069" />
                <Text style={sharingStyles.label}>Share Cab With</Text>
                {sharingWith.length > 0 && (
                    <View style={sharingStyles.countBadge}>
                        <Text style={sharingStyles.countBadgeText}>{sharingWith.length}</Text>
                    </View>
                )}
            </View>

            {/* Selected user chips */}
            {sharingWith.length > 0 && (
                <View style={sharingStyles.chipsContainer}>
                    {sharingWith.map(user => (
                        <View key={user.employee_id} style={sharingStyles.chip}>
                            <View style={sharingStyles.chipAvatar}>
                                <Text style={sharingStyles.chipAvatarText}>
                                    {getInitials(user.full_name)}
                                </Text>
                            </View>
                            <Text style={sharingStyles.chipName} numberOfLines={1}>
                                {user.full_name.split(' ')[0]}
                            </Text>
                            <TouchableOpacity
                                onPress={() => onRemove(user.employee_id)}
                                hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
                                accessibilityLabel={`Remove ${user.full_name}`}
                            >
                                <MaterialCommunityIcons name="close-circle" size={16} color="#008069" />
                            </TouchableOpacity>
                        </View>
                    ))}
                </View>
            )}

            {/* Search input */}
            <View style={sharingStyles.inputWrapper}>
                <MaterialCommunityIcons name="magnify" size={18} color="#aaa" style={sharingStyles.searchIcon} />
                <TextInput
                    style={sharingStyles.searchInput}
                    placeholder={
                        sharingWith.length === 0
                            ? 'Search by name, email or employee ID'
                            : 'Add another person…'
                    }
                    placeholderTextColor="#bbb"
                    value={query}
                    onChangeText={handleQueryChange}
                    autoCorrect={false}
                    autoCapitalize="none"
                    returnKeyType="search"
                    accessibilityLabel="Search users to share cab with"
                />
                {searching && (
                    <ActivityIndicator size="small" color="#008069" style={sharingStyles.inputLoader} />
                )}
                {query.length > 0 && !searching && (
                    <TouchableOpacity
                        onPress={() => { setQuery(''); setResults([]); setShowDropdown(false); }}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                        <MaterialCommunityIcons name="close-circle-outline" size={18} color="#bbb" />
                    </TouchableOpacity>
                )}
            </View>

            {/* Autocomplete dropdown */}
            {showDropdown && (
                <View style={sharingStyles.dropdown}>
                    {results.length > 0 ? (
                        <ScrollView
                            style={sharingStyles.dropdownScroll}
                            keyboardShouldPersistTaps="handled"
                            nestedScrollEnabled
                            showsVerticalScrollIndicator={false}
                        >
                            {results.map((user, index) => (
                                <TouchableOpacity
                                    key={user.employee_id}
                                    style={[
                                        sharingStyles.dropdownItem,
                                        index === results.length - 1 && sharingStyles.dropdownItemLast,
                                    ]}
                                    onPress={() => handleSelect(user)}
                                    activeOpacity={0.7}
                                >
                                    <View style={sharingStyles.dropdownAvatar}>
                                        <Text style={sharingStyles.dropdownAvatarText}>
                                            {getInitials(user.full_name)}
                                        </Text>
                                    </View>
                                    <View style={sharingStyles.dropdownUserInfo}>
                                        <Text style={sharingStyles.dropdownUserName}>{user.full_name}</Text>
                                        <Text style={sharingStyles.dropdownUserMeta} numberOfLines={1}>
                                            {user.employee_id} · {user.email}
                                        </Text>
                                    </View>
                                    <MaterialCommunityIcons name="plus-circle-outline" size={20} color="#008069" />
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    ) : !searching && query.length >= 2 ? (
                        <View style={sharingStyles.emptyState}>
                            <MaterialCommunityIcons name="account-search-outline" size={28} color="#ddd" />
                            <Text style={sharingStyles.emptyStateText}>No users found</Text>
                        </View>
                    ) : null}
                </View>
            )}

            {/* Helper text */}
            <Text style={sharingStyles.helperText}>
                Selected passengers will receive a booking notification
            </Text>
        </View>
    );
};

const sharingStyles = StyleSheet.create({
    container: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 1,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 12,
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        color: '#555',
        flex: 1,
        textTransform: 'uppercase',
        letterSpacing: 0.4,
    },
    countBadge: {
        backgroundColor: '#008069',
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        paddingHorizontal: 6,
        alignItems: 'center',
        justifyContent: 'center',
    },
    countBadgeText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '700',
    },
    chipsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 12,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,128,105,0.07)',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(0,128,105,0.22)',
        paddingVertical: 5,
        paddingLeft: 6,
        paddingRight: 8,
        gap: 6,
        maxWidth: 160,
    },
    chipAvatar: {
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: '#008069',
        alignItems: 'center',
        justifyContent: 'center',
    },
    chipAvatarText: {
        color: '#fff',
        fontSize: 9,
        fontWeight: '700',
    },
    chipName: {
        fontSize: 13,
        color: '#008069',
        fontWeight: '600',
        flex: 1,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f9f9f9',
        borderWidth: 1.5,
        borderColor: '#e8e8e8',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: Platform.OS === 'ios' ? 11 : 4,
        gap: 8,
    },
    searchIcon: { flexShrink: 0 },
    searchInput: {
        flex: 1,
        fontSize: 15,
        color: '#333',
        paddingVertical: 0,
    },
    inputLoader: { flexShrink: 0 },
    dropdown: {
        marginTop: 6,
        backgroundColor: '#fff',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#e0e0e0',
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
        elevation: 3,
    },
    dropdownScroll: { maxHeight: 200 },
    dropdownItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        gap: 12,
    },
    dropdownItemLast: { borderBottomWidth: 0 },
    dropdownAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#008069',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    dropdownAvatarText: { color: '#fff', fontWeight: '700', fontSize: 12 },
    dropdownUserInfo: { flex: 1 },
    dropdownUserName: { fontSize: 14, fontWeight: '600', color: '#333' },
    dropdownUserMeta: { fontSize: 12, color: '#888', marginTop: 2 },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 20,
        gap: 6,
    },
    emptyStateText: { fontSize: 13, color: '#aaa' },
    helperText: {
        fontSize: 11,
        color: '#aaa',
        marginTop: 10,
        lineHeight: 15,
    },
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
    const [keyboardHeight, setKeyboardHeight] = useState(0);

    const scrollViewRef = useRef<ScrollView>(null);
    const purposeYRef = useRef<number>(0);

    useEffect(() => {
        if (Platform.OS !== 'android') return;
        const showSub = Keyboard.addListener('keyboardDidShow', e => {
            setKeyboardHeight(e.endCoordinates.height);
        });
        const hideSub = Keyboard.addListener('keyboardDidHide', () => {
            setKeyboardHeight(0);
        });
        return () => { showSub.remove(); hideSub.remove(); };
    }, []);

    useEffect(() => {
        return () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current); };
    }, []);

    useEffect(() => {
        if (!visible) {
            setActivePicker(null);
            setLocalSearchQuery('');
            setLocalUserResults([]);
            setShowUserSearch(false);
            setKeyboardHeight(0);
        }
    }, [visible]);

    const handlePurposeFocus = () => {
        setTimeout(() => {
            scrollViewRef.current?.scrollTo({
                y: purposeYRef.current - 16,
                animated: true,
            });
        }, 150);
    };

    // ── "Booking for someone else" search ──
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

    // ── Cab sharing handlers ──
    const handleAddSharingUser = (user: AssignedEmployee) => {
        const alreadyAdded = bookingForm.sharingWith.some(u => u.employee_id === user.employee_id);
        if (alreadyAdded) return;
        setBookingForm({ ...bookingForm, sharingWith: [...bookingForm.sharingWith, user] });
    };

    const handleRemoveSharingUser = (employeeId: string) => {
        setBookingForm({
            ...bookingForm,
            sharingWith: bookingForm.sharingWith.filter(u => u.employee_id !== employeeId),
        });
    };

    const sharingExcludeIds: string[] = [
        ...(bookingForm.bookingFor ? [bookingForm.bookingFor.employee_id] : []),
    ];

    // ── Picker helpers ──
    const getPickerValue = (): Date => {
        switch (activePicker) {
            case 'startDate': return bookingForm.startDate;
            case 'startTime': return bookingForm.startTime;
            case 'endDate':   return bookingForm.endDate;
            case 'endTime':   return bookingForm.endTime;
            default:          return new Date();
        }
    };

    const getPickerMode = (): 'date' | 'time' =>
        activePicker === 'startDate' || activePicker === 'endDate' ? 'date' : 'time';

    const getPickerTitle = (): string => {
        switch (activePicker) {
            case 'startDate': return 'Select Start Date';
            case 'startTime': return 'Select Start Time';
            case 'endDate':   return 'Select End Date';
            case 'endTime':   return 'Select End Time';
            default:          return 'Select';
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
                        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                        enabled={Platform.OS === 'ios'}
                        style={styles.keyboardAvoidingView}
                        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
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
                                ref={scrollViewRef}
                                style={styles.modalScroll}
                                showsVerticalScrollIndicator={false}
                                keyboardShouldPersistTaps="handled"
                                keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'none'}
                                contentContainerStyle={{ paddingBottom: keyboardHeight }}
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
                                    <View style={styles.sectionTitleRow}>
                                        <Text style={styles.sectionTitle}>Trip Route</Text>
                                        <Text style={styles.requiredStar}>*</Text>
                                    </View>
                                    <View style={styles.routeCard}>
                                        <View style={styles.routeRow}>
                                            <View style={[styles.routeDot, { backgroundColor: '#00d285' }]} />
                                            <View style={styles.routeInputWrapper}>
                                                <View style={styles.routeLabelRow}>
                                                    <Text style={styles.routeLabel}>PICKUP LOCATION</Text>
                                                    <Text style={styles.fieldStar}>*</Text>
                                                </View>
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
                                                <View style={styles.routeLabelRow}>
                                                    <Text style={styles.routeLabel}>DROP-OFF LOCATION</Text>
                                                    <Text style={styles.fieldStar}>*</Text>
                                                </View>
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
                                            onPressDate={() => { Keyboard.dismiss(); setActivePicker('startDate'); }}
                                            onPressTime={() => { Keyboard.dismiss(); setActivePicker('startTime'); }}
                                        />
                                        <DateTimeRow
                                            label="🔴  Drop-off Date & Time"
                                            accentColor="#ff5e7a"
                                            date={bookingForm.endDate}
                                            time={bookingForm.endTime}
                                            onPressDate={() => { Keyboard.dismiss(); setActivePicker('endDate'); }}
                                            onPressTime={() => { Keyboard.dismiss(); setActivePicker('endTime'); }}
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
                                <View
                                    style={styles.section}
                                    onLayout={(e) => { purposeYRef.current = e.nativeEvent.layout.y; }}
                                >
                                    <View style={styles.sectionTitleRow}>
                                        <Text style={styles.sectionTitle}>Purpose</Text>
                                        <Text style={styles.requiredStar}>*</Text>
                                    </View>
                                    <TextInput
                                        style={[styles.formInput, styles.textArea]}
                                        value={bookingForm.purpose}
                                        onChangeText={t => setBookingForm({ ...bookingForm, purpose: t })}
                                        placeholder="e.g., Client meeting, Site visit, Airport pickup"
                                        placeholderTextColor="#bbb"
                                        multiline
                                        numberOfLines={3}
                                        onFocus={handlePurposeFocus}
                                        scrollEnabled={false}
                                    />
                                    <Text style={styles.requiredNote}>* Required field</Text>
                                </View>

                                {/* ── Booking For Someone Else ── */}
                                <View style={[styles.section, { marginBottom: 12 }]}>
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

                                {/* ── Cab Sharing ── */}
                                <View style={[styles.section, { marginBottom: 8 }]}>
                                    <Text style={styles.sectionTitle}>Cab Sharing</Text>
                                    <CabSharingSection
                                        sharingWith={bookingForm.sharingWith}
                                        onAdd={handleAddSharingUser}
                                        onRemove={handleRemoveSharingUser}
                                        excludeEmployeeIds={sharingExcludeIds}
                                    />
                                </View>

                                {/* ── Required fields note ── */}
                                <Text style={styles.globalRequiredNote}>* Indicates required fields</Text>

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

                    {/* ── iOS Picker Sheet (inside Modal overlay) ── */}
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

            {/* ── Android Date/Time Picker (must live outside Modal) ── */}
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

            {/* ── Web Date/Time Picker ── */}
            {Platform.OS === 'web' && (
                <WebPickerModal
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
        flex: 1,
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
    modalScroll: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },

    section: { marginBottom: 16 },
    sectionTitle: {
        fontSize: 14, fontWeight: '700', color: '#333',
        marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5,
    },
    sectionTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        gap: 3,
    },
    requiredStar: {
        fontSize: 16,
        fontWeight: '700',
        color: '#ff5e7a',
        lineHeight: 20,
        marginBottom: 2,
    },
    routeLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
        marginBottom: 4,
    },
    fieldStar: {
        fontSize: 13,
        fontWeight: '700',
        color: '#ff5e7a',
        lineHeight: 16,
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
    routeLabel: { fontSize: 11, color: '#999', fontWeight: '600', textTransform: 'uppercase' },
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
    globalRequiredNote: {
        fontSize: 11,
        color: '#aaa',
        marginTop: 2,
        marginBottom: 12,
        textAlign: 'right',
    },

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
        backgroundColor: '#f9f9f9', borderWidth: 1.5, borderColor: '#e8e8e8',
        borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11,
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