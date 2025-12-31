import React, { useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    TextInput, ActivityIndicator, Alert, Image
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BookingStep, BookingFormData } from './types';
import { formatDateForDisplay, formatTimeForDisplay } from './utils';
import { colors } from '../../styles/theme';

interface BookingScreenProps {
    bookingStep: BookingStep;
    setBookingStep: (step: BookingStep) => void;
    bookingForm: BookingFormData;
    setBookingForm: (form: BookingFormData) => void;
    selectedCity: string;
    loading: boolean;
    onBack: () => void;
    onSearchCabs: () => void;
    onSetActivePickerType: (type: string) => void;
    formatTimeForDisplay: (date: Date) => string;
    formatDateForDisplay: (date: Date) => string;
}

const BackIcon = () => (
    <View style={styles.backIcon}>
        <View style={styles.backArrow} /><Text style={styles.backText}>Back</Text>
    </View>
);

const BookingScreen: React.FC<BookingScreenProps> = ({
    bookingStep,
    setBookingStep,
    bookingForm,
    setBookingForm,
    selectedCity,
    loading,
    onBack,
    onSearchCabs,
    onSetActivePickerType,
    formatTimeForDisplay,
    formatDateForDisplay
}) => {
    const fromInputRef = useRef<TextInput>(null);
    const toInputRef = useRef<TextInput>(null);

    const handleNextStep = (nextStep: BookingStep) => {
        if (bookingStep === 1 && !bookingForm.fromLocation.trim()) {
            Alert.alert('Error', 'Please enter pickup location');
            return;
        }
        if (bookingStep === 2 && !bookingForm.toLocation.trim()) {
            Alert.alert('Error', 'Please enter destination');
            return;
        }
        setBookingStep(nextStep);

        if (nextStep === 2) {
            setTimeout(() => {
                toInputRef.current?.focus();
            }, 100);
        }
    };

    return (
        <View style={styles.screenContainer}>
            <ScrollView
                style={styles.scrollContainer}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
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
                                    <BackIcon />
                                </TouchableOpacity>
                                <View style={styles.headerCenter}>
                                    <Text style={styles.logoText}>CITADEL</Text>
                                </View>
                                <View style={{ width: 2 }} />
                            </View>
                        </View>

                        <View style={styles.titleSection}>
                            <Text style={styles.headerTitle}>Book Car</Text>
                        </View>
                    </LinearGradient>
                </View>

                <View style={styles.bookingFormContent}>
                    {/* Step 1: From Location */}
                    {bookingStep === 1 && (
                        <View style={styles.formStep}>
                            <View style={styles.stepHeader}>
                                <View style={styles.stepIcon}>
                                    <MaterialCommunityIcons name="map-marker" size={24} color="#fff" />
                                </View>
                                <View>
                                    <Text style={styles.stepTitle}>Where from?</Text>
                                    <Text style={styles.stepSubtitle}>Enter your pickup location</Text>
                                </View>
                            </View>
                            <View style={styles.formGroup}>
                                <TextInput
                                    ref={fromInputRef}
                                    style={styles.formInput}
                                    value={bookingForm.fromLocation}
                                    onChangeText={(text) => setBookingForm({ ...bookingForm, fromLocation: text })}
                                    placeholder="Enter pickup location"
                                    placeholderTextColor="#999"
                                    autoFocus={bookingStep === 1}
                                />
                            </View>
                            <TouchableOpacity
                                style={[styles.searchBtn, !bookingForm.fromLocation.trim() && styles.disabledBtn]}
                                onPress={() => handleNextStep(2)}
                                disabled={!bookingForm.fromLocation.trim()}
                            >
                                <Text style={styles.searchBtnText}>Next →</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Step 2: To Location */}
                    {bookingStep === 2 && (
                        <View style={styles.formStep}>
                            <View style={styles.stepHeader}>
                                <View style={[styles.stepIcon, { backgroundColor: '#ffb157' }]}>
                                    <MaterialCommunityIcons name="map-marker-check" size={24} color="#fff" />
                                </View>
                                <View>
                                    <Text style={styles.stepTitle}>Where to?</Text>
                                    <Text style={styles.stepSubtitle}>Enter your destination</Text>
                                </View>
                            </View>
                            <View style={styles.formGroup}>
                                <TextInput
                                    ref={toInputRef}
                                    style={styles.formInput}
                                    value={bookingForm.toLocation}
                                    onChangeText={(text) => setBookingForm({ ...bookingForm, toLocation: text })}
                                    placeholder="Enter destination"
                                    placeholderTextColor="#999"
                                    autoFocus={bookingStep === 2}
                                />
                            </View>
                            <TouchableOpacity
                                style={[styles.searchBtn, !bookingForm.toLocation.trim() && styles.disabledBtn]}
                                onPress={() => handleNextStep(3)}
                                disabled={!bookingForm.toLocation.trim()}
                            >
                                <Text style={styles.searchBtnText}>Next →</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Step 3: Schedule */}
                    {bookingStep === 3 && (
                        <View style={styles.formStep}>
                            <View style={styles.stepHeader}>
                                <View style={[styles.stepIcon, { backgroundColor: '#ff5e7a' }]}>
                                    <MaterialCommunityIcons name="clock" size={24} color="#fff" />
                                </View>
                                <View>
                                    <Text style={styles.stepTitle}>When?</Text>
                                    <Text style={styles.stepSubtitle}>Select date and time</Text>
                                </View>
                            </View>
                            <View style={styles.formGroup}>
                                <Text style={styles.formLabel}>Start Date & Time</Text>
                                <View style={styles.dateTimeRow}>
                                    <TouchableOpacity
                                        style={styles.dateTimeInput}
                                        onPress={() => onSetActivePickerType('startDate')}
                                    >
                                        <MaterialCommunityIcons name="calendar" size={20} color="#017bf9" />
                                        <Text style={styles.dateTimeText}>
                                            {formatDateForDisplay(bookingForm.startDate)}
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.dateTimeInput}
                                        onPress={() => onSetActivePickerType('startTime')}
                                    >
                                        <MaterialCommunityIcons name="clock-outline" size={20} color="#017bf9" />
                                        <Text style={styles.dateTimeText}>
                                            {formatTimeForDisplay(bookingForm.startTime)}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                            <View style={styles.formGroup}>
                                <Text style={styles.formLabel}>End Date & Time</Text>
                                <View style={styles.dateTimeRow}>
                                    <TouchableOpacity
                                        style={styles.dateTimeInput}
                                        onPress={() => onSetActivePickerType('endDate')}
                                    >
                                        <MaterialCommunityIcons name="calendar" size={20} color="#017bf9" />
                                        <Text style={styles.dateTimeText}>
                                            {formatDateForDisplay(bookingForm.endDate)}
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.dateTimeInput}
                                        onPress={() => onSetActivePickerType('endTime')}
                                    >
                                        <MaterialCommunityIcons name="clock-outline" size={20} color="#017bf9" />
                                        <Text style={styles.dateTimeText}>
                                            {formatTimeForDisplay(bookingForm.endTime)}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                            <TouchableOpacity
                                style={[styles.searchBtn, loading && styles.disabledBtn]}
                                onPress={onSearchCabs}
                                disabled={loading}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#fff" size="small" />
                                ) : (
                                    <Text style={styles.searchBtnText}>Search Available Cabs</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    screenContainer: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    scrollContainer: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
    },
    header: {
        height: 180,
        position: 'relative',
        overflow: 'hidden',
    },
    headerBanner: {
        height: 250,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        overflow: 'hidden',
        position: 'relative',
    },
    headerImage: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        height: '100%',
        opacity: 1,
    },
    headerOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
    },
    headerContent: {
        flex: 1,
        paddingHorizontal: 20,
        paddingVertical: 40,
        position: 'relative',
        zIndex: 1,
    },
    headerTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerCenter: {
        flex: 1,
        alignItems: 'center',
        marginRight: 60,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '600',
        color: '#fff',
    },
    titleSection: {
        paddingHorizontal: 20,
        paddingVertical: 25,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
    },
    headerSubtitle: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.9)',
        fontWeight: '400',
        textAlign: 'center',
    },
    bookingFormContent: {
        padding: 20,
        paddingBottom: 100,
    },
    formStep: {
        backgroundColor: '#fff',
        borderRadius: 15,
        padding: 20,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 15,
        elevation: 2,
        minHeight: 300,
    },
    stepHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    stepIcon: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#00d285',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 15,
    },
    stepTitle: {
        fontSize: 20,
        color: '#333',
        fontWeight: '600',
    },
    stepSubtitle: {
        fontSize: 14,
        color: '#666',
        marginTop: 4,
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
    dateTimeRow: {
        flexDirection: 'row',
        gap: 10,
    },
    dateTimeInput: {
        flex: 1,
        backgroundColor: '#fff',
        borderWidth: 2,
        borderColor: '#e0e0e0',
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 10,
        flexDirection: 'row',
        alignItems: 'center',
    },
    dateTimeText: {
        fontSize: 13,
        color: '#333',
        marginLeft: 10,
    },
    searchBtn: {
        backgroundColor: '#00d285',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 20,
    },
    searchBtnText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
    },
    disabledBtn: {
        opacity: 0.5,
    },
    logoText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '800',
        letterSpacing: 1,
        textAlign: 'center',
    },
    backIcon: {
        height: 24,
        alignItems: 'center',
        justifyContent: 'center',
        display: 'flex',
        flexDirection: 'row',
        alignContent: 'center'
    },
    backArrow: {
        width: 12,
        height: 12,
        borderLeftWidth: 2,
        borderTopWidth: 2,
        borderColor: '#fff',
        transform: [{ rotate: '-45deg' }],
    },
    backButton: {
        padding: 8,
    },
    backText: {
        color: colors.white,
        fontSize: 14,
        marginLeft: 2,
    },
});

export default BookingScreen;