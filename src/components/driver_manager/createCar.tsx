import React, { useState, useEffect } from 'react';
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

interface Office {
    id: number;
    name: string;
    address: {
        id: number;
        address: string;
        city: string;
        state: string;
        country: string;
        zip_code: string;
    };
    latitude: number | null;
    longitude: number | null;
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
    office_id: string; // Changed from office to office_id
    pollution_certificate: Document | null;
    insurance_certificate: Document | null;
    registration_certificate: Document | null;
    photos: Document[];
}

// Helper function to fetch all offices
const fetchAllOffices = async (token: string | null): Promise<Office[]> => {
    try {
        const response = await fetch(`${BACKEND_URL}/manager/getOffices`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ token }),
        });

        const text = await response.text();
        console.log('All offices response:', text.substring(0, 500));

        if (text.trim().startsWith('{')) {
            const data = JSON.parse(text);
            if (response.ok && data.offices && data.offices.length > 0) {
                console.log('Offices found:', data.offices.length);
                return data.offices;
            }
        }
        throw new Error('No offices found');
    } catch (error) {
        console.error('Error fetching offices:', error);
        throw error;
    }
};

const CreateCar: React.FC<CreateCarProps> = ({
    token,
    city,
    onBack,
    onCarCreated,
}) => {
    const [loading, setLoading] = useState(false);
    const [offices, setOffices] = useState<Office[]>([]);
    const [loadingOffices, setLoadingOffices] = useState(true);
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
        office_id: '', // Changed from office to office_id
        pollution_certificate: null,
        insurance_certificate: null,
        registration_certificate: null,
        photos: [],
    });

    const fuelTypes = ['Petrol', 'Diesel', 'Electric', 'Hybrid', 'CNG'];
    const vehicleTypes = ['Sedan', 'SUV', 'Hatchback', 'MPV', 'Luxury'];
    const statuses = ['available', 'not_available', 'in_maintenance'];

    useEffect(() => {
        // Fetch all offices on component mount
        const loadOffices = async () => {
            try {
                setLoadingOffices(true);
                const officesData = await fetchAllOffices(token);
                setOffices(officesData);
                
                // Try to find and pre-select an office based on the city
                if (city && officesData.length > 0) {
                    const officeInCity = officesData.find(office => 
                        office.address.city.toLowerCase().includes(city.toLowerCase()) ||
                        city.toLowerCase().includes(office.address.city.toLowerCase())
                    );
                    if (officeInCity) {
                        setFormData(prev => ({
                            ...prev,
                            office_id: officeInCity.id.toString()
                        }));
                    }
                }
            } catch (error) {
                console.error('Failed to load offices:', error);
                Alert.alert('Error', 'Failed to load offices. Please try again.');
            } finally {
                setLoadingOffices(false);
            }
        };

        loadOffices();
    }, [token, city]);

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

        if (!formData.office_id) {
            Alert.alert('Error', 'Please select an office for the vehicle');
            return;
        }

        if (!formData.pollution_certificate || !formData.insurance_certificate || !formData.registration_certificate) {
            Alert.alert('Error', 'All certificates are required');
            return;
        }

        if (formData.photos.length === 0) {
            Alert.alert('Error', 'At least one photo is required');
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
            formDataToSend.append('office', formData.office_id); // Keep as 'office' for backend compatibility

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

            console.log('Submitting vehicle creation with office ID:', formData.office_id);

            const response = await fetch(`${BACKEND_URL}/manager/createVehicle`, {
                method: 'POST',
                body: formDataToSend,
            });

            const text = await response.text();
            console.log('Create vehicle response:', text.substring(0, 500));

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
            Alert.alert('Error', 'Network error occurred. Please check your connection.');
        } finally {
            setLoading(false);
        }
    };

    const formatOfficeAddress = (office: Office) => {
        return `${office.address.address}, ${office.address.city}, ${office.address.state}, ${office.address.country} - ${office.address.zip_code}`;
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
                                placeholderTextColor="#999"
                            />
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>Model *</Text>
                            <TextInput
                                style={styles.formInput}
                                value={formData.model}
                                onChangeText={(text) => setFormData({ ...formData, model: text })}
                                placeholder="e.g., Camry, Civic"
                                placeholderTextColor="#999"
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
                                placeholderTextColor="#999"
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
                                placeholderTextColor="#999"
                            />
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>Color *</Text>
                            <TextInput
                                style={styles.formInput}
                                value={formData.color}
                                onChangeText={(text) => setFormData({ ...formData, color: text })}
                                placeholder="e.g., White, Black"
                                placeholderTextColor="#999"
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
                                placeholderTextColor="#999"
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

                    {/* Office Selection Section */}
                    <View style={styles.formSection}>
                        <Text style={styles.sectionTitle}>Office Selection</Text>
                        <Text style={styles.formLabel}>Select Office *</Text>
                        
                        {loadingOffices ? (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator size="small" color="#075E54" />
                                <Text style={styles.loadingText}>Loading offices...</Text>
                            </View>
                        ) : offices.length === 0 ? (
                            <View style={styles.errorContainer}>
                                <Ionicons name="warning-outline" size={24} color="#FF9500" />
                                <Text style={styles.errorText}>No offices found. Please contact administrator.</Text>
                            </View>
                        ) : (
                            <View style={styles.officeListContainer}>
                                {offices.map((office) => (
                                    <TouchableOpacity
                                        key={office.id}
                                        style={[
                                            styles.officeItem,
                                            formData.office_id === office.id.toString() && styles.officeItemSelected,
                                        ]}
                                        onPress={() => setFormData({ ...formData, office_id: office.id.toString() })}
                                    >
                                        <View style={styles.officeRadio}>
                                            <View style={[
                                                styles.radioOuter,
                                                formData.office_id === office.id.toString() && styles.radioOuterSelected,
                                            ]}>
                                                {formData.office_id === office.id.toString() && (
                                                    <View style={styles.radioInner} />
                                                )}
                                            </View>
                                        </View>
                                        <View style={styles.officeInfo}>
                                            <Text style={styles.officeName}>
                                                {office.name || 'Unnamed Office'}
                                            </Text>
                                            <Text style={styles.officeAddress} numberOfLines={2}>
                                                {formatOfficeAddress(office)}
                                            </Text>
                                            <Text style={styles.officeCity}>
                                                {office.address.city}, {office.address.state}
                                            </Text>
                                        </View>
                                        {city && office.address.city.toLowerCase().includes(city.toLowerCase()) && (
                                            <View style={styles.currentCityBadge}>
                                                <Text style={styles.currentCityText}>Current City</Text>
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                        
                        {formData.office_id && (
                            <View style={styles.selectedOfficeContainer}>
                                <MaterialIcons name="check-circle" size={20} color="#4CAF50" />
                                <Text style={styles.selectedOfficeText}>
                                    Office Selected: {
                                        offices.find(o => o.id.toString() === formData.office_id)?.name || 
                                        offices.find(o => o.id.toString() === formData.office_id)?.address.city
                                    }
                                </Text>
                            </View>
                        )}
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
                        <Text style={styles.formLabel}>Vehicle Photos (Minimum 1 required) *</Text>
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
                        style={[styles.submitButton, (loading || !formData.office_id) && styles.submitButtonDisabled]}
                        onPress={handleSubmit}
                        disabled={loading || !formData.office_id}
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