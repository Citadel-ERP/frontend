import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    TextInput,
    Alert,
    ActivityIndicator,
    Platform,
    KeyboardAvoidingView,
} from 'react-native';
import { MaterialCommunityIcons, MaterialIcons, Ionicons } from '@expo/vector-icons';
import { styles } from './styles';
import { BACKEND_URL } from '../../config/config';
import { Document } from './types';
import * as DocumentPicker from 'expo-document-picker';

interface CreateCarProps {
    token: string | null;
    city: string;
    onBack: () => void;
    onCarCreated: () => void;
}

interface CarFormData {
    make: string;
    model: string;
    year: string;
    license_plate: string;
    color: string;
    seating_capacity: string;
    fuel_type: string;
    status: string;
    vehicle_type: string;
    pollution_certificate: Document | null;
    insurance_certificate: Document | null;
    registration_certificate: Document | null;
    photos: Document[];
}

const CreateCar: React.FC<CreateCarProps> = ({
    token,
    city,
    onBack,
    onCarCreated,
}) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState<CarFormData>({
        make: '',
        model: '',
        year: new Date().getFullYear().toString(),
        license_plate: '',
        color: '',
        seating_capacity: '4',
        fuel_type: 'Petrol',
        status: 'available',
        vehicle_type: 'Sedan',
        pollution_certificate: null,
        insurance_certificate: null,
        registration_certificate: null,
        photos: [],
    });

    const fuelTypes = ['Petrol', 'Diesel', 'Electric', 'Hybrid', 'CNG'];
    const vehicleTypes = ['Sedan', 'SUV', 'Hatchback', 'MPV', 'Luxury'];
    const statuses = ['available', 'not_available', 'in_maintenance'];

    const handleDocumentPick = async (type: 'pollution' | 'insurance' | 'registration' | 'photo') => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['image/*', 'application/pdf'],
                copyToCacheDirectory: true,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const document = result.assets[0];
                const docObject = {
                    uri: document.uri,
                    name: document.name,
                    type: document.mimeType || 'application/octet-stream',
                };

                switch (type) {
                    case 'pollution':
                        setFormData({ ...formData, pollution_certificate: docObject });
                        break;
                    case 'insurance':
                        setFormData({ ...formData, insurance_certificate: docObject });
                        break;
                    case 'registration':
                        setFormData({ ...formData, registration_certificate: docObject });
                        break;
                    case 'photo':
                        setFormData({ ...formData, photos: [...formData.photos, docObject] });
                        break;
                }
            }
        } catch (error) {
            console.error('Error picking document:', error);
            Alert.alert('Error', 'Failed to pick document');
        }
    };

    const handleSubmit = async () => {
        // Validation
        if (!formData.make || !formData.model || !formData.license_plate || !formData.color) {
            Alert.alert('Error', 'Please fill in all required fields');
            return;
        }

        if (!formData.pollution_certificate || !formData.insurance_certificate || !formData.registration_certificate) {
            Alert.alert('Error', 'All certificates are required');
            return;
        }

        setLoading(true);
        try {
            const formDataToSend = new FormData();
            formDataToSend.append('token', token || '');
            formDataToSend.append('make', formData.make);
            formDataToSend.append('model', formData.model);
            formDataToSend.append('year', formData.year);
            formDataToSend.append('license_plate', formData.license_plate);
            formDataToSend.append('color', formData.color);
            formDataToSend.append('seating_capacity', formData.seating_capacity);
            formDataToSend.append('fuel_type', formData.fuel_type);
            formDataToSend.append('status', formData.status);
            formDataToSend.append('vehicle_type', formData.vehicle_type);
            formDataToSend.append('current_location', city);

            // Append certificates
            if (formData.pollution_certificate) {
                formDataToSend.append('pollution_certificate', formData.pollution_certificate as any);
            }
            if (formData.insurance_certificate) {
                formDataToSend.append('insurance_certificate', formData.insurance_certificate as any);
            }
            if (formData.registration_certificate) {
                formDataToSend.append('registration_certificate', formData.registration_certificate as any);
            }

            // Append photos
            formData.photos.forEach((photo, index) => {
                formDataToSend.append('photos', photo as any);
            });

            const response = await fetch(`${BACKEND_URL}/manager/createVehicle`, {
                method: 'POST',
                body: formDataToSend,
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            const text = await response.text();
            if (text.trim().startsWith('{')) {
                const data = JSON.parse(text);
                if (response.ok) {
                    Alert.alert('Success', 'Vehicle created successfully!');
                    onCarCreated();
                    onBack();
                } else {
                    Alert.alert('Error', data.message || 'Failed to create vehicle');
                }
            } else {
                Alert.alert('Error', 'Invalid response from server');
            }
        } catch (error) {
            console.error('Error creating vehicle:', error);
            Alert.alert('Error', 'Network error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.screenContainer}>
            <View style={styles.detailHeader}>
                <TouchableOpacity style={styles.detailBackButton} onPress={onBack}>
                    <View style={styles.backIcon}>
                        <View style={styles.backArrow} />
                        <Text style={styles.backText}>Back</Text>
                    </View>
                </TouchableOpacity>
                <Text style={styles.detailHeaderTitle}>Add New Vehicle</Text>
                <View style={styles.detailHeaderSpacer} />
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView
                    style={styles.scrollContainer}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.formSection}>
                        <Text style={styles.sectionTitle}>Basic Information</Text>

                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>Make *</Text>
                            <TextInput
                                style={styles.formInput}
                                value={formData.make}
                                onChangeText={(text) => setFormData({ ...formData, make: text })}
                                placeholder="e.g., Toyota, Honda"
                            />
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>Model *</Text>
                            <TextInput
                                style={styles.formInput}
                                value={formData.model}
                                onChangeText={(text) => setFormData({ ...formData, model: text })}
                                placeholder="e.g., Camry, Civic"
                            />
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>Year</Text>
                            <TextInput
                                style={styles.formInput}
                                value={formData.year}
                                onChangeText={(text) => setFormData({ ...formData, year: text })}
                                placeholder="e.g., 2023"
                                keyboardType="numeric"
                            />
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>License Plate *</Text>
                            <TextInput
                                style={styles.formInput}
                                value={formData.license_plate}
                                onChangeText={(text) => setFormData({ ...formData, license_plate: text })}
                                placeholder="e.g., MH01AB1234"
                                autoCapitalize="characters"
                            />
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>Color *</Text>
                            <TextInput
                                style={styles.formInput}
                                value={formData.color}
                                onChangeText={(text) => setFormData({ ...formData, color: text })}
                                placeholder="e.g., White, Black"
                            />
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>Seating Capacity</Text>
                            <TextInput
                                style={styles.formInput}
                                value={formData.seating_capacity}
                                onChangeText={(text) => setFormData({ ...formData, seating_capacity: text })}
                                placeholder="4"
                                keyboardType="numeric"
                            />
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>Fuel Type</Text>
                            <View style={styles.optionsContainer}>
                                {fuelTypes.map((type) => (
                                    <TouchableOpacity
                                        key={type}
                                        style={[
                                            styles.optionButton,
                                            formData.fuel_type === type && styles.optionButtonSelected,
                                        ]}
                                        onPress={() => setFormData({ ...formData, fuel_type: type })}
                                    >
                                        <Text
                                            style={[
                                                styles.optionButtonText,
                                                formData.fuel_type === type && styles.optionButtonTextSelected,
                                            ]}
                                        >
                                            {type}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>Vehicle Type</Text>
                            <View style={styles.optionsContainer}>
                                {vehicleTypes.map((type) => (
                                    <TouchableOpacity
                                        key={type}
                                        style={[
                                            styles.optionButton,
                                            formData.vehicle_type === type && styles.optionButtonSelected,
                                        ]}
                                        onPress={() => setFormData({ ...formData, vehicle_type: type })}
                                    >
                                        <Text
                                            style={[
                                                styles.optionButtonText,
                                                formData.vehicle_type === type && styles.optionButtonTextSelected,
                                            ]}
                                        >
                                            {type}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>Status</Text>
                            <View style={styles.optionsContainer}>
                                {statuses.map((status) => (
                                    <TouchableOpacity
                                        key={status}
                                        style={[
                                            styles.optionButton,
                                            formData.status === status && styles.optionButtonSelected,
                                        ]}
                                        onPress={() => setFormData({ ...formData, status })}
                                    >
                                        <Text
                                            style={[
                                                styles.optionButtonText,
                                                formData.status === status && styles.optionButtonTextSelected,
                                            ]}
                                        >
                                            {status.replace('_', ' ').toUpperCase()}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    </View>

                    <View style={styles.formSection}>
                        <Text style={styles.sectionTitle}>Documents</Text>

                        <View style={styles.documentGroup}>
                            <Text style={styles.formLabel}>Pollution Certificate *</Text>
                            {formData.pollution_certificate ? (
                                <View style={styles.documentSelected}>
                                    <MaterialIcons name="description" size={24} color="#075E54" />
                                    <Text style={styles.documentName} numberOfLines={1}>
                                        {formData.pollution_certificate.name}
                                    </Text>
                                    <TouchableOpacity
                                        onPress={() => setFormData({ ...formData, pollution_certificate: null })}
                                    >
                                        <Ionicons name="close-circle" size={24} color="#FF3B30" />
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <TouchableOpacity
                                    style={styles.documentButton}
                                    onPress={() => handleDocumentPick('pollution')}
                                >
                                    <MaterialIcons name="upload-file" size={24} color="#075E54" />
                                    <Text style={styles.documentButtonText}>Upload Pollution Certificate</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        <View style={styles.documentGroup}>
                            <Text style={styles.formLabel}>Insurance Certificate *</Text>
                            {formData.insurance_certificate ? (
                                <View style={styles.documentSelected}>
                                    <MaterialIcons name="description" size={24} color="#075E54" />
                                    <Text style={styles.documentName} numberOfLines={1}>
                                        {formData.insurance_certificate.name}
                                    </Text>
                                    <TouchableOpacity
                                        onPress={() => setFormData({ ...formData, insurance_certificate: null })}
                                    >
                                        <Ionicons name="close-circle" size={24} color="#FF3B30" />
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <TouchableOpacity
                                    style={styles.documentButton}
                                    onPress={() => handleDocumentPick('insurance')}
                                >
                                    <MaterialIcons name="upload-file" size={24} color="#075E54" />
                                    <Text style={styles.documentButtonText}>Upload Insurance Certificate</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        <View style={styles.documentGroup}>
                            <Text style={styles.formLabel}>Registration Certificate *</Text>
                            {formData.registration_certificate ? (
                                <View style={styles.documentSelected}>
                                    <MaterialIcons name="description" size={24} color="#075E54" />
                                    <Text style={styles.documentName} numberOfLines={1}>
                                        {formData.registration_certificate.name}
                                    </Text>
                                    <TouchableOpacity
                                        onPress={() => setFormData({ ...formData, registration_certificate: null })}
                                    >
                                        <Ionicons name="close-circle" size={24} color="#FF3B30" />
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <TouchableOpacity
                                    style={styles.documentButton}
                                    onPress={() => handleDocumentPick('registration')}
                                >
                                    <MaterialIcons name="upload-file" size={24} color="#075E54" />
                                    <Text style={styles.documentButtonText}>Upload Registration Certificate</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>

                    <View style={styles.formSection}>
                        <Text style={styles.sectionTitle}>Photos</Text>
                        <TouchableOpacity
                            style={styles.photoButton}
                            onPress={() => handleDocumentPick('photo')}
                        >
                            <MaterialIcons name="add-a-photo" size={24} color="#075E54" />
                            <Text style={styles.photoButtonText}>Add Photo</Text>
                        </TouchableOpacity>

                        {formData.photos.length > 0 && (
                            <View style={styles.photosContainer}>
                                {formData.photos.map((photo, index) => (
                                    <View key={index} style={styles.photoItem}>
                                        <MaterialIcons name="image" size={24} color="#075E54" />
                                        <Text style={styles.photoName} numberOfLines={1}>
                                            {photo.name}
                                        </Text>
                                        <TouchableOpacity
                                            onPress={() => {
                                                const newPhotos = [...formData.photos];
                                                newPhotos.splice(index, 1);
                                                setFormData({ ...formData, photos: newPhotos });
                                            }}
                                        >
                                            <Ionicons name="close-circle" size={20} color="#FF3B30" />
                                        </TouchableOpacity>
                                    </View>
                                ))}
                            </View>
                        )}
                    </View>

                    <TouchableOpacity
                        style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                        onPress={handleSubmit}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#FFFFFF" size="small" />
                        ) : (
                            <>
                                <MaterialCommunityIcons name="car" size={24} color="#FFFFFF" />
                                <Text style={styles.submitButtonText}>Add Vehicle</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
};

export default CreateCar;