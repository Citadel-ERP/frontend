import React from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    TextInput, ActivityIndicator, Modal, KeyboardAvoidingView,
    Platform
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BookingFormData, AssignedEmployee } from './types';

interface BookVehicleModalProps {
    visible: boolean;
    onClose: () => void;
    bookingForm: BookingFormData;
    setBookingForm: (form: BookingFormData) => void;
    loading: boolean;
    onBookVehicle: () => void;
    showUserSuggestions: boolean;
    setShowUserSuggestions: (show: boolean) => void;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    userSearchResults: AssignedEmployee[];
    onSelectUser: (user: AssignedEmployee) => void;
    onRemoveUser: () => void;
}

const BookVehicleModal: React.FC<BookVehicleModalProps> = ({
    visible,
    onClose,
    bookingForm,
    setBookingForm,
    loading,
    onBookVehicle,
    showUserSuggestions,
    setShowUserSuggestions,
    searchQuery,
    setSearchQuery,
    userSearchResults,
    onSelectUser,
    onRemoveUser
}) => {
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
                            <Text style={styles.modalTitle}>Booking Details</Text>
                            <TouchableOpacity
                                style={styles.modalClose}
                                onPress={onClose}
                            >
                                <Ionicons name="close" size={24} color="#333" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalScroll}>
                            <View style={styles.formGroup}>
                                <Text style={styles.formLabel}>Purpose of Trip</Text>
                                <TextInput
                                    style={styles.formInput}
                                    value={bookingForm.purpose}
                                    onChangeText={(text) => setBookingForm({ ...bookingForm, purpose: text })}
                                    placeholder="e.g., Office commute, Client meeting"
                                    placeholderTextColor="#999"
                                />
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.formLabel}>Grace Period (hours)</Text>
                                <TextInput
                                    style={styles.formInput}
                                    value={bookingForm.gracePeriod}
                                    onChangeText={(text) => setBookingForm({ ...bookingForm, gracePeriod: text })}
                                    placeholder="Enter grace period in hours"
                                    placeholderTextColor="#999"
                                    keyboardType="numeric"
                                />
                            </View>

                            <View style={styles.checkboxWrapper}>
                                <TouchableOpacity
                                    style={styles.checkbox}
                                    onPress={() => {
                                        if (!bookingForm.bookingFor) {
                                            setShowUserSuggestions(true);
                                        } else {
                                            setBookingForm({ ...bookingForm, bookingFor: null });
                                        }
                                    }}
                                >
                                    <MaterialCommunityIcons
                                        name={bookingForm.bookingFor ? "checkbox-marked" : "checkbox-blank-outline"}
                                        size={24}
                                        color="#017bf9"
                                    />
                                </TouchableOpacity>
                                <Text style={styles.checkboxLabel}>Booking for someone else</Text>
                            </View>

                            {bookingForm.bookingFor && (
                                <View style={styles.selectedPerson}>
                                    <View style={styles.selectedPersonAvatar}>
                                        <Text style={styles.selectedPersonAvatarText}>
                                            {bookingForm.bookingFor.full_name.split(' ').map(n => n[0]).join('')}
                                        </Text>
                                    </View>
                                    <Text style={styles.selectedPersonName}>Booking for: {bookingForm.bookingFor.full_name}</Text>
                                    <TouchableOpacity
                                        style={styles.removeBtn}
                                        onPress={onRemoveUser}
                                    >
                                        <Ionicons name="close" size={20} color="#ff5e7a" />
                                    </TouchableOpacity>
                                </View>
                            )}

                            {showUserSuggestions && (
                                <View style={styles.autocompleteWrapper}>
                                    <TextInput
                                        style={styles.formInput}
                                        placeholder="Search by name, employee ID, or email"
                                        placeholderTextColor="#999"
                                        value={searchQuery}
                                        onChangeText={setSearchQuery}
                                    />
                                    <ScrollView style={styles.autocompleteList}>
                                        {userSearchResults.map((user) => (
                                            <TouchableOpacity
                                                key={user.employee_id}
                                                style={styles.autocompleteItem}
                                                onPress={() => onSelectUser(user)}
                                            >
                                                <View style={styles.userAvatar}>
                                                    <Text style={styles.userAvatarText}>
                                                        {user.full_name.split(' ').map(n => n[0]).join('')}
                                                    </Text>
                                                </View>
                                                <View>
                                                    <Text style={styles.userName}>{user.full_name}</Text>
                                                    <Text style={styles.userDetails}>{user.employee_id} • {user.email}</Text>
                                                </View>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>
                            )}

                            <TouchableOpacity
                                style={[styles.searchBtn, loading && styles.disabledBtn]}
                                onPress={onBookVehicle}
                                disabled={loading || !bookingForm.purpose.trim()}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#fff" size="small" />
                                ) : (
                                    <Text style={styles.searchBtnText}>Confirm Booking</Text>
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
    checkboxWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 15,
    },
    checkbox: {
        marginRight: 10,
    },
    checkboxLabel: {
        fontSize: 16,
        color: '#333',
    },
    selectedPerson: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(1,123,249,0.1)',
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 20,
        marginTop: 10,
    },
    selectedPersonAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#ff5e7a',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    selectedPersonAvatarText: {
        color: '#fff',
        fontWeight: '600',
    },
    selectedPersonName: {
        flex: 1,
        color: '#017bf9',
        fontWeight: '500',
    },
    removeBtn: {
        marginLeft: 10,
    },
    autocompleteWrapper: {
        marginTop: 10,
    },
    autocompleteList: {
        maxHeight: 150,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#017bf9',
        borderRadius: 12,
        marginTop: 5,
    },
    autocompleteItem: {
        padding: 12,
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    userAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#ff5e7a',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    userAvatarText: {
        color: '#fff',
        fontWeight: '600',
    },
    userName: {
        fontWeight: '600',
        color: '#333',
    },
    userDetails: {
        fontSize: 12,
        color: '#666',
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
});

export default BookVehicleModal;