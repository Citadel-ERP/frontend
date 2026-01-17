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
import DateTimePicker from '@react-native-community/datetimepicker';
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
    office_id: string;
    pollution_certificate: Document | null;
    pollution_expiry_date: string;
    insurance_certificate: Document | null;
    insurance_expiry_date: string;
    registration_certificate: Document | null;
    registration_expiry_date: string;
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
    const [vehicleTypeDropdownOpen, setVehicleTypeDropdownOpen] = useState(false);
    const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
    const [pollutionDatePickerOpen, setPollutionDatePickerOpen] = useState(false);
    const [insuranceDatePickerOpen, setInsuranceDatePickerOpen] = useState(false);
    const [registrationDatePickerOpen, setRegistrationDatePickerOpen] = useState(false);
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
        office_id: '',
        pollution_certificate: null,
        pollution_expiry_date: '',
        insurance_certificate: null,
        insurance_expiry_date: '',
        registration_certificate: null,
        registration_expiry_date: '',
        photos: [],
    });

    const fuelTypes = ['Petrol', 'Diesel', 'Electric', 'Hybrid', 'CNG'];
    const vehicleTypes = ['Sedan', 'SUV', 'Hatchback', 'MPV', 'Luxury'];
    const statuses = ['available', 'not_available', 'in_maintenance'];
    const [dropdownOpen, setDropdownOpen] = useState(false);

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
            // Check photo limit
            if (type === 'photo' && formData.photos.length >= 6) {
                Alert.alert('Limit Reached', 'You can only upload up to 6 photos');
                return;
            }

            const result = await DocumentPicker.getDocumentAsync({
                type: type === 'photo' ? ['image/*'] : ['image/*', 'application/pdf'],
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
                        if (formData.photos.length < 6) {
                            setFormData({ ...formData, photos: [...formData.photos, docObject] });
                        }
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

        if (!formData.pollution_expiry_date || !formData.insurance_expiry_date || !formData.registration_expiry_date) {
            Alert.alert('Error', 'All certificate expiry dates are required');
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
            formDataToSend.append('office', formData.office_id);

            // Append certificates
            if (formData.pollution_certificate) {
                formDataToSend.append('pollution_certificate', formData.pollution_certificate as any);
                formDataToSend.append('pollution_expiry_date', formData.pollution_expiry_date);
            }
            if (formData.insurance_certificate) {
                formDataToSend.append('insurance_certificate', formData.insurance_certificate as any);
                formDataToSend.append('insurance_expiry_date', formData.insurance_expiry_date);
            }
            if (formData.registration_certificate) {
                formDataToSend.append('registration_certificate', formData.registration_certificate as any);
                formDataToSend.append('registration_expiry_date', formData.registration_expiry_date);
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
            <View style={[styles.detailHeader]}>
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
                    <View style={[styles.formSection, { marginTop: 20 }]}>
                        <Text style={[styles.sectionTitle, { color: '#000', fontSize: 20, marginBottom: 15, fontWeight: '400' }]}>Basic Information</Text>

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
                            <Text style={[styles.formLabel, { marginBottom: 6 }]}>Fuel Type</Text>
                            <View style={styles.dropdownContainer}>
                                <TouchableOpacity
                                    style={styles.dropdown}
                                    onPress={() => setDropdownOpen(!dropdownOpen)}
                                >
                                    <Text style={styles.dropdownText}>
                                        {formData.fuel_type || 'Select Fuel Type'}
                                    </Text>
                                    <Text style={styles.dropdownArrow}>{dropdownOpen ? '▲' : '▼'}</Text>
                                </TouchableOpacity>

                                {dropdownOpen && (
                                    <View style={styles.dropdownList}>
                                        {fuelTypes.map((type) => (
                                            <TouchableOpacity
                                                key={type}
                                                style={styles.dropdownItem}
                                                onPress={() => {
                                                    setFormData({ ...formData, fuel_type: type });
                                                    setDropdownOpen(false);
                                                }}
                                            >
                                                <Text style={styles.dropdownItemText}>{type}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                )}
                            </View>
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={[styles.formLabel, { marginBottom: 6 }]}>Vehicle Type</Text>
                            <View style={styles.dropdownContainer}>
                                <TouchableOpacity
                                    style={styles.dropdown}
                                    onPress={() => setVehicleTypeDropdownOpen(!vehicleTypeDropdownOpen)}
                                >
                                    <Text style={styles.dropdownText}>
                                        {formData.vehicle_type || 'Select Vehicle Type'}
                                    </Text>
                                    <Text style={styles.dropdownArrow}>{vehicleTypeDropdownOpen ? '▲' : '▼'}</Text>
                                </TouchableOpacity>

                                {vehicleTypeDropdownOpen && (
                                    <View style={styles.dropdownList}>
                                        {vehicleTypes.map((type) => (
                                            <TouchableOpacity
                                                key={type}
                                                style={styles.dropdownItem}
                                                onPress={() => {
                                                    setFormData({ ...formData, vehicle_type: type });
                                                    setVehicleTypeDropdownOpen(false);
                                                }}
                                            >
                                                <Text style={styles.dropdownItemText}>{type}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                )}
                            </View>
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={[styles.formLabel, { marginBottom: 6 }]}>Status</Text>
                            <View style={styles.dropdownContainer}>
                                <TouchableOpacity
                                    style={styles.dropdown}
                                    onPress={() => setStatusDropdownOpen(!statusDropdownOpen)}
                                >
                                    <Text style={styles.dropdownText}>
                                        {formData.status ? formData.status.replace('_', ' ').toUpperCase() : 'Select Status'}
                                    </Text>
                                    <Text style={styles.dropdownArrow}>{statusDropdownOpen ? '▲' : '▼'}</Text>
                                </TouchableOpacity>

                                {statusDropdownOpen && (
                                    <View style={styles.dropdownList}>
                                        {statuses.map((status) => (
                                            <TouchableOpacity
                                                key={status}
                                                style={styles.dropdownItem}
                                                onPress={() => {
                                                    setFormData({ ...formData, status });
                                                    setStatusDropdownOpen(false);
                                                }}
                                            >
                                                <Text style={styles.dropdownItemText}>
                                                    {status.replace('_', ' ').toUpperCase()}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                )}
                            </View>
                        </View>
                    </View>

                    {/* Office Selection Section */}
                    <View style={styles.formSection}>
                        <Text style={[styles.sectionTitle, { color: '#000', fontSize: 20, marginBottom: 15, fontWeight: '400' }]}>Office Selection</Text>
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

                    {/* <View style={styles.formSection}>
                        <Text style={[styles.sectionTitle, { color: '#000', fontSize: 20, marginBottom: 15, fontWeight: '400' }]}>Documents</Text>

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
                    </View> */}

                    <View style={styles.formSection}>
                        <Text style={[styles.sectionTitle, { color: '#000', fontSize: 20, marginBottom: 15, fontWeight: '400' }]}>Documents</Text>

                        <View style={styles.documentGroup}>
                            <Text style={[styles.formLabel, { marginBottom: 10 }]}>Pollution Certificate *</Text>



                            {/* Document Upload */}
                            {formData.pollution_certificate ? (
                                <View style={styles.documentSelected}>
                                    <View style={[styles.documentIconContainer]}>
                                        <MaterialIcons name="description" size={28} color="#075E54" />
                                    </View>
                                    <View style={[styles.documentInfo, { width: 150 }]}>
                                        <Text style={styles.documentName} numberOfLines={1}>
                                            {formData.pollution_certificate.name}
                                        </Text>
                                        <Text style={styles.documentSize}>
                                            {formData.pollution_certificate.type?.split('/')[1]?.toUpperCase() || 'FILE'}
                                        </Text>
                                    </View>
                                    <TouchableOpacity
                                        style={styles.removeButton}
                                        onPress={() => setFormData({
                                            ...formData,
                                            pollution_certificate: null,
                                            pollution_expiry_date: ''
                                        })}
                                    >
                                        <Ionicons name="close-circle" size={28} color="#FF3B30" />
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <TouchableOpacity
                                    style={styles.documentButton}
                                    onPress={() => handleDocumentPick('pollution')}
                                >
                                    <View style={styles.uploadIconContainer}>
                                        <MaterialIcons name="cloud-upload" size={28} color="#075E54" />
                                    </View>
                                    <View style={styles.uploadTextContainer}>
                                        <Text style={styles.documentButtonText}>Upload Pollution Certificate</Text>
                                        <Text style={styles.documentButtonSubtext}>PDF or Image (Max 5MB)</Text>
                                    </View>
                                </TouchableOpacity>
                            )}

                            {/* Expiry Date Field */}
                            <View style={styles.expiryDateContainer}>
                                <Text style={[styles.expiryLabel, { marginTop: 8 }]}>Expiry Date *</Text>
                                <TouchableOpacity
                                    style={styles.datePickerButton}
                                    onPress={() => setPollutionDatePickerOpen(true)}
                                >
                                    <MaterialIcons name="calendar-today" size={20} color="#075E54" />
                                    <Text style={styles.datePickerText}>
                                        {formData.pollution_expiry_date
                                            ? new Date(formData.pollution_expiry_date).toLocaleDateString('en-GB')
                                            : 'Select Expiry Date'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.documentGroup}>
                            <Text style={[styles.formLabel, { marginBottom: 10 }]}>Insurance Certificate *</Text>
                            {/* Document Upload */}
                            {formData.insurance_certificate ? (
                                <View style={styles.documentSelected}>
                                    <View style={styles.documentIconContainer}>
                                        <MaterialIcons name="description" size={28} color="#075E54" />
                                    </View>
                                    <View style={[styles.documentInfo, { width: 150 }]}>
                                        <Text style={styles.documentName} numberOfLines={1}>
                                            {formData.insurance_certificate.name}
                                        </Text>
                                        <Text style={styles.documentSize}>
                                            {formData.insurance_certificate.type?.split('/')[1]?.toUpperCase() || 'FILE'}
                                        </Text>
                                    </View>
                                    <TouchableOpacity
                                        style={styles.removeButton}
                                        onPress={() => setFormData({
                                            ...formData,
                                            insurance_certificate: null,
                                            insurance_expiry_date: ''
                                        })}
                                    >
                                        <Ionicons name="close-circle" size={28} color="#FF3B30" />
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <TouchableOpacity
                                    style={styles.documentButton}
                                    onPress={() => handleDocumentPick('insurance')}
                                >
                                    <View style={styles.uploadIconContainer}>
                                        <MaterialIcons name="cloud-upload" size={28} color="#075E54" />
                                    </View>
                                    <View style={styles.uploadTextContainer}>
                                        <Text style={styles.documentButtonText}>Upload Insurance Certificate</Text>
                                        <Text style={styles.documentButtonSubtext}>PDF or Image (Max 5MB)</Text>
                                    </View>
                                </TouchableOpacity>
                            )}

                            {/* Expiry Date Field */}
                            <View style={styles.expiryDateContainer}>
                                <Text style={[styles.expiryLabel, { marginTop: 8 }]}>Expiry Date *</Text>
                                <TouchableOpacity
                                    style={styles.datePickerButton}
                                    onPress={() => setInsuranceDatePickerOpen(true)}
                                >
                                    <MaterialIcons name="calendar-today" size={20} color="#075E54" />
                                    <Text style={styles.datePickerText}>
                                        {formData.insurance_expiry_date
                                            ? new Date(formData.insurance_expiry_date).toLocaleDateString('en-GB')
                                            : 'Select Expiry Date'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.documentGroup}>
                            <Text style={[styles.formLabel, { marginBottom: 10 }]}>Registration Certificate *</Text>
                            {/* Document Upload */}
                            {formData.registration_certificate ? (
                                <View style={styles.documentSelected}>
                                    <View style={styles.documentIconContainer}>
                                        <MaterialIcons name="description" size={28} color="#075E54" />
                                    </View>
                                    <View style={[styles.documentInfo, { width: 150 }]}>
                                        <Text style={styles.documentName} numberOfLines={1}>
                                            {formData.registration_certificate.name}
                                        </Text>
                                        <Text style={styles.documentSize}>
                                            {formData.registration_certificate.type?.split('/')[1]?.toUpperCase() || 'FILE'}
                                        </Text>
                                    </View>
                                    <TouchableOpacity
                                        style={styles.removeButton}
                                        onPress={() => setFormData({
                                            ...formData,
                                            registration_certificate: null,
                                            registration_expiry_date: ''
                                        })}
                                    >
                                        <Ionicons name="close-circle" size={28} color="#FF3B30" />
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <TouchableOpacity
                                    style={styles.documentButton}
                                    onPress={() => handleDocumentPick('registration')}
                                >
                                    <View style={styles.uploadIconContainer}>
                                        <MaterialIcons name="cloud-upload" size={28} color="#075E54" />
                                    </View>
                                    <View style={styles.uploadTextContainer}>
                                        <Text style={styles.documentButtonText}>Upload Registration Certificate</Text>
                                        <Text style={styles.documentButtonSubtext}>PDF or Image (Max 5MB)</Text>
                                    </View>
                                </TouchableOpacity>
                            )}

                            {/* Expiry Date Field */}
                            <View style={styles.expiryDateContainer}>
                                <Text style={[styles.expiryLabel, { marginTop: 8 }]}>Expiry Date *</Text>
                                <TouchableOpacity
                                    style={styles.datePickerButton}
                                    onPress={() => setRegistrationDatePickerOpen(true)}
                                >
                                    <MaterialIcons name="calendar-today" size={20} color="#075E54" />
                                    <Text style={styles.datePickerText}>
                                        {formData.registration_expiry_date
                                            ? new Date(formData.registration_expiry_date).toLocaleDateString('en-GB')
                                            : 'Select Expiry Date'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Date Picker Modals */}
                        {pollutionDatePickerOpen && (
                            <DateTimePicker
                                value={formData.pollution_expiry_date ? new Date(formData.pollution_expiry_date) : new Date()}
                                mode="date"
                                display="default"
                                onChange={(event, selectedDate) => {
                                    setPollutionDatePickerOpen(false);
                                    if (selectedDate) {
                                        setFormData({ ...formData, pollution_expiry_date: selectedDate.toISOString() });
                                    }
                                }}
                                minimumDate={new Date()}
                            />
                        )}

                        {insuranceDatePickerOpen && (
                            <DateTimePicker
                                value={formData.insurance_expiry_date ? new Date(formData.insurance_expiry_date) : new Date()}
                                mode="date"
                                display="default"
                                onChange={(event, selectedDate) => {
                                    setInsuranceDatePickerOpen(false);
                                    if (selectedDate) {
                                        setFormData({ ...formData, insurance_expiry_date: selectedDate.toISOString() });
                                    }
                                }}
                                minimumDate={new Date()}
                            />
                        )}

                        {registrationDatePickerOpen && (
                            <DateTimePicker
                                value={formData.registration_expiry_date ? new Date(formData.registration_expiry_date) : new Date()}
                                mode="date"
                                display="default"
                                onChange={(event, selectedDate) => {
                                    setRegistrationDatePickerOpen(false);
                                    if (selectedDate) {
                                        setFormData({ ...formData, registration_expiry_date: selectedDate.toISOString() });
                                    }
                                }}
                                minimumDate={new Date()}
                            />
                        )}
                    </View>

                    {/* Photo Gallery Section */}
                    <View style={styles.formSection}>
                        <View style={styles.sectionHeaderRow}>
                            <View style={styles.sectionHeaderLeft}>
                                {/* <View style={styles.photoSectionIconContainer}>
                                    <MaterialIcons name="photo-library" size={22} color="#075E54" />
                                </View> */}
                                <View>
                                    <Text style={[styles.sectionTitle, { color: '#000', fontSize: 20, marginBottom: 4, fontWeight: '400' }]}>
                                        Vehicle Photos
                                    </Text>
                                    <Text style={styles.photoSectionSubtitle}>
                                        Add up to 6 photos (minimum 1 required) *
                                    </Text>
                                </View>
                            </View>
                        </View>

                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.photoScrollContent}
                            style={styles.photoScrollContainer}
                        >
                            {[...Array(6)].map((_, index) => {
                                const photo = formData.photos[index];
                                const hasPhoto = photo !== undefined;
                                const isFirstPhoto = index === 0;

                                return (
                                    <TouchableOpacity
                                        key={index}
                                        style={[
                                            styles.photoSlot,
                                            isFirstPhoto && styles.firstPhotoSlot,
                                            hasPhoto && styles.photoSlotFilled
                                        ]}
                                        onPress={() => {
                                            if (!hasPhoto && formData.photos.length < 6) {
                                                handleDocumentPick('photo');
                                            }
                                        }}
                                        activeOpacity={0.7}
                                        disabled={hasPhoto}
                                    >
                                        {hasPhoto ? (
                                            <>
                                                <View style={styles.photoPreviewContainer}>
                                                    <MaterialIcons name="image" size={48} color="#075E54" />
                                                    <Text style={styles.photoFileName} numberOfLines={2}>
                                                        {photo.name}
                                                    </Text>
                                                </View>
                                                <TouchableOpacity
                                                    style={styles.removePhotoButton}
                                                    onPress={() => {
                                                        const newPhotos = [...formData.photos];
                                                        newPhotos.splice(index, 1);
                                                        setFormData({ ...formData, photos: newPhotos });
                                                    }}
                                                >
                                                    <Ionicons name="close" size={18} color="#fff" />
                                                </TouchableOpacity>
                                                <View style={styles.photoIndexBadge}>
                                                    <Text style={styles.photoIndexText}>{index + 1}</Text>
                                                </View>
                                                {isFirstPhoto && (
                                                    <View style={styles.primaryPhotoBadge}>
                                                        <MaterialIcons name="star" size={12} color="#FFD700" />
                                                        <Text style={styles.primaryPhotoText}>Primary</Text>
                                                    </View>
                                                )}
                                            </>
                                        ) : (
                                            <View style={styles.emptyPhotoSlot}>
                                                <View style={styles.addPhotoIconContainer}>
                                                    <Ionicons name="add" size={32} color="#075E54" />
                                                </View>
                                                <Text style={styles.addPhotoText}>Add Photo</Text>
                                                <Text style={styles.photoSlotNumber}>{index + 1}</Text>
                                                {isFirstPhoto && (
                                                    <View style={styles.requiredBadge}>
                                                        <Text style={styles.requiredBadgeText}>Required</Text>
                                                    </View>
                                                )}
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>

                        {formData.photos.length > 0 && (
                            <View style={styles.photoCountContainer}>
                                <MaterialIcons name="photo" size={16} color="#075E54" />
                                <Text style={styles.photoCountText}>
                                    {formData.photos.length} of 6 photos added
                                </Text>
                            </View>
                        )}
                    </View>

                    <TouchableOpacity
                        style={[styles.submitButton, (loading || !formData.office_id) && styles.submitButtonDisabled, { width: '90%', alignItems: 'center', justifyContent: 'center', marginLeft: 20 }]}
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