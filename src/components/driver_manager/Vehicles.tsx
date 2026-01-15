import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    Alert,
    ActivityIndicator,
    FlatList,
    Image,
    Dimensions,
    NativeScrollEvent,
    NativeSyntheticEvent,
    TextInput,
    Platform,
    Linking
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialIcons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';

import { styles } from './styles';
import { VehicleImage } from './VehicleImage';
import MaintenanceModal from './addMaintenanceModal';
import MaintenanceLogsModal from './MaintenanceLogsModal';
import { FuelLogsModal } from './FuelLogsModal';
import {
    Vehicle,
    MaintenanceRecord,
    FuelLog,
    ViewType,
    Document,
} from './types';
import { BACKEND_URL } from '../../config/config';
import { formatDate, getStatusColor, getStatusIcon } from './utils';
import { FuelLogModal } from '../driver/components/modals/FuelLogModal';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 40;
const IMAGE_SLOT_WIDTH = (width - 80) / 3;

interface VehiclesProps {
    token: string | null;
    city: string;
    onBack: () => void;
    setActiveTab: (tab: 'vehicles' | 'bookings') => void;
    activeTab: 'vehicles' | 'bookings';
    setLoading: (loading: boolean) => void;
    loading: boolean;
}

interface VehiclePhoto {
    id: number;
    photo: string;
    uri?: string;
    isNew?: boolean;
}

interface UpdateVehicleForm {
    make: string;
    model: string;
    license_plate: string;
    color: string;
    fuel_type: string;
    seating_capacity: string;
    year: string;
    photos: VehiclePhoto[];
    pollution_certificate: Document | null;
    rc_document: Document | null;
    insurance_document: Document | null;
    existing_pollution_certificate?: string | null;
    existing_rc_document?: string | null;
    existing_insurance_document?: string | null;
}

const Vehicles: React.FC<VehiclesProps> = ({
    token,
    city,
    onBack,
    setActiveTab,
    activeTab,
    setLoading,
    loading,
}) => {
    const [currentView, setCurrentView] = useState<ViewType>('main');
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [maintenanceLogs, setMaintenanceLogs] = useState<MaintenanceRecord[]>([]);
    const [fuelLogs, setFuelLogs] = useState<FuelLog[]>([]);
    const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
    const [isMaintenanceModalVisible, setIsMaintenanceModalVisible] = useState(false);
    const [isFuelLogModalVisible, setIsFuelLogModalVisible] = useState(false);
    const [isMaintenanceLogsModalVisible, setIsMaintenanceLogsModalVisible] = useState(false);
    const [isFuelLogsModalVisible, setIsFuelLogsModalVisible] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);
    const scrollViewRef = useRef<ScrollView>(null);
    const photoScrollRef = useRef<ScrollView>(null);
    const [deletedPhotoIds, setDeletedPhotoIds] = useState<number[]>([]);
    const [maintenanceForm, setMaintenanceForm] = useState({
        cost: '',
        description: '',
        start_date: '',
        end_date: '',
        document: null as Document | null,
    });
    const [fuelLogForm, setFuelLogForm] = useState({
        quantity: '',
        cost: '',
        odometer_reading: '',
    });
    const [vehicleStatus, setVehicleStatus] = useState('available');
    const [updateVehicleForm, setUpdateVehicleForm] = useState<UpdateVehicleForm>({
        make: '',
        model: '',
        license_plate: '',
        color: '',
        fuel_type: '',
        seating_capacity: '',
        year: '',
        photos: [],
        pollution_certificate: null,
        rc_document: null,
        insurance_document: null,
    });

    useEffect(() => {
        if (token) {
            fetchVehicles();
        }
    }, [token, city]);

    const fetchVehicles = async () => {
        setLoading(true);
        try {
            console.log('Fetching vehicles from:', `${BACKEND_URL}/manager/getCars`);

            const response = await fetch(`${BACKEND_URL}/manager/getCars`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ token, city }),
            });

            console.log('Vehicles response status:', response.status);
            const text = await response.text();
            console.log('Vehicles response text (first 500 chars):', text.substring(0, 500));

            if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
                try {
                    const data = JSON.parse(text);

                    if (response.ok) {
                        const vehiclesData = data.vehicle || data.vehicles || data || [];
                        setVehicles(Array.isArray(vehiclesData) ? vehiclesData : [vehiclesData]);
                    } else {
                        Alert.alert('Error', data.message || 'Failed to fetch vehicles');
                    }
                } catch (parseError) {
                    console.error('Failed to parse JSON:', parseError);
                    Alert.alert('Error', 'Invalid response format from server');
                }
            } else {
                console.error('Non-JSON response:', text.substring(0, 200));
                Alert.alert('Error', 'Server returned an unexpected response');
            }
        } catch (error) {
            console.error('Error fetching vehicles:', error);
            Alert.alert('Network Error', 'Unable to connect to server. Please check your internet connection.');
        } finally {
            setLoading(false);
        }
    };

    const fetchMaintenanceLogs = async (vehicleId: number) => {
        setLoading(true);
        try {
            const response = await fetch(`${BACKEND_URL}/manager/getMaintainanceLogs`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ token, vehicle_id: vehicleId }),
            });

            const text = await response.text();
            console.log('Maintenance logs response:', text.substring(0, 500));

            if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
                try {
                    const data = JSON.parse(text);

                    if (response.ok) {
                        const logs = data.maintainance_logs || data.maintenance_logs || data || [];
                        setMaintenanceLogs(Array.isArray(logs) ? logs : [logs]);
                        setIsMaintenanceLogsModalVisible(true);
                    } else {
                        Alert.alert('Error', data.message || 'Failed to fetch maintenance logs');
                    }
                } catch (parseError) {
                    console.error('Failed to parse maintenance logs:', parseError);
                    Alert.alert('Error', 'Invalid response from server');
                }
            } else {
                console.error('Non-JSON response from maintenance logs:', text.substring(0, 200));
                Alert.alert('Error', 'Invalid response from server');
            }
        } catch (error) {
            console.error('Error fetching maintenance logs:', error);
            Alert.alert('Error', 'Network error occurred');
        } finally {
            setLoading(false);
        }
    };

    const fetchFuelLogs = async (vehicleId: number) => {
        setLoading(true);
        try {
            const response = await fetch(`${BACKEND_URL}/manager/getFuelLogs`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ token, vehicle_id: vehicleId }),
            });

            const text = await response.text();

            if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
                try {
                    const data = JSON.parse(text);

                    if (response.ok) {
                        setFuelLogs(data.fuel_logs || data || []);
                        setIsFuelLogsModalVisible(true);
                    } else {
                        Alert.alert('Error', data.message || 'Failed to fetch fuel logs');
                    }
                } catch (parseError) {
                    console.error('Failed to parse fuel logs:', parseError);
                    Alert.alert('Error', 'Invalid response from server');
                }
            } else {
                console.error('Non-JSON response from fuel logs:', text.substring(0, 200));
                Alert.alert('Error', 'Invalid response from server');
            }
        } catch (error) {
            console.error('Error fetching fuel logs:', error);
            Alert.alert('Error', 'Network error occurred');
        } finally {
            setLoading(false);
        }
    };

    const updateVehicleStatus = async () => {
        if (!selectedVehicle) return;

        setLoading(true);
        try {
            const response = await fetch(`${BACKEND_URL}/manager/updateVehicleStatus`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    token,
                    vehicle_id: selectedVehicle.id,
                    status: vehicleStatus,
                }),
            });

            const text = await response.text();

            if (text.trim().startsWith('{')) {
                try {
                    const data = JSON.parse(text);

                    if (response.ok) {
                        Alert.alert('Success', 'Vehicle status updated successfully!');
                        setCurrentView('main');
                        fetchVehicles();
                    } else {
                        Alert.alert('Error', data.message || 'Failed to update vehicle status');
                    }
                } catch (parseError) {
                    console.error('Failed to parse update response:', parseError);
                    Alert.alert('Error', 'Invalid response from server');
                }
            } else {
                console.error('Non-JSON response from update vehicle status:', text.substring(0, 200));
                Alert.alert('Error', 'Invalid response from server');
            }
        } catch (error) {
            console.error('Error updating vehicle status:', error);
            Alert.alert('Error', 'Network error occurred');
        } finally {
            setLoading(false);
        }
    };

    const submitMaintenance = async () => {
        if (
            !selectedVehicle ||
            !maintenanceForm.cost ||
            !maintenanceForm.description ||
            !maintenanceForm.start_date ||
            !maintenanceForm.end_date
        ) {
            Alert.alert('Error', 'Please fill all required fields');
            return;
        }

        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('token', token || '');
            formData.append('vehicle_id', selectedVehicle.id.toString());
            formData.append('cost', maintenanceForm.cost);
            formData.append('description', maintenanceForm.description);
            formData.append('start_date', maintenanceForm.start_date);
            formData.append('end_date', maintenanceForm.end_date);

            if (maintenanceForm.document) {
                formData.append('document', maintenanceForm.document as any);
            }

            const response = await fetch(`${BACKEND_URL}/manager/createMaintainance`, {
                method: 'POST',
                body: formData,
            });

            const text = await response.text();
            console.log('Create maintenance response:', text.substring(0, 500));

            if (text.trim().startsWith('{')) {
                try {
                    const data = JSON.parse(text);

                    if (response.ok) {
                        Alert.alert('Success', 'Maintenance record created successfully!');
                        setIsMaintenanceModalVisible(false);
                        setMaintenanceForm({
                            cost: '',
                            description: '',
                            start_date: '',
                            end_date: '',
                            document: null,
                        });
                        fetchVehicles();
                    } else {
                        Alert.alert('Error', data.message || 'Failed to create maintenance record');
                    }
                } catch (parseError) {
                    console.error('Failed to parse create maintenance response:', parseError);
                    Alert.alert('Error', 'Invalid response from server');
                }
            } else {
                console.error('Non-JSON response from create maintenance:', text.substring(0, 200));
                Alert.alert('Error', 'Invalid response from server. Check endpoint spelling.');
            }
        } catch (error) {
            console.error('Error creating maintenance:', error);
            Alert.alert('Error', 'Network error occurred');
        } finally {
            setLoading(false);
        }
    };

    const submitFuelLog = async () => {
        if (!selectedVehicle || !fuelLogForm.quantity || !fuelLogForm.cost || !fuelLogForm.odometer_reading) {
            Alert.alert('Error', 'Please fill all required fields');
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(`${BACKEND_URL}/manager/addFuelLog`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    token,
                    vehicle_id: selectedVehicle.id,
                    quantity: fuelLogForm.quantity,
                    cost: fuelLogForm.cost,
                    odometer_reading: fuelLogForm.odometer_reading,
                }),
            });

            const text = await response.text();

            if (text.trim().startsWith('{')) {
                try {
                    const data = JSON.parse(text);

                    if (response.ok) {
                        Alert.alert('Success', 'Fuel log added successfully!');
                        setIsFuelLogModalVisible(false);
                        setFuelLogForm({ quantity: '', cost: '', odometer_reading: '' });
                        fetchVehicles();
                    } else {
                        Alert.alert('Error', data.message || 'Failed to add fuel log');
                    }
                } catch (parseError) {
                    console.error('Failed to parse add fuel log response:', parseError);
                    Alert.alert('Error', 'Invalid response from server');
                }
            } else {
                console.error('Non-JSON response from add fuel log:', text.substring(0, 200));
                Alert.alert('Error', 'Invalid response from server');
            }
        } catch (error) {
            console.error('Error adding fuel log:', error);
            Alert.alert('Error', 'Network error occurred');
        } finally {
            setLoading(false);
        }
    };

    const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const scrollPosition = event.nativeEvent.contentOffset.x;
        const index = Math.round(scrollPosition / CARD_WIDTH);
        setActiveIndex(index);
    };

    const handleDeleteVehicle = async (vehicleId: number) => {
        Alert.alert(
            'Delete Vehicle',
            'Are you sure you want to delete this vehicle? This action cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        setLoading(true);
                        try {
                            const response = await fetch(`${BACKEND_URL}/manager/deleteVehicle`, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Accept': 'application/json'
                                },
                                body: JSON.stringify({
                                    token,
                                    vehicle_id: vehicleId
                                }),
                            });

                            const text = await response.text();

                            if (text.trim().startsWith('{')) {
                                const data = JSON.parse(text);
                                if (response.ok) {
                                    Alert.alert('Success', 'Vehicle deleted successfully!');
                                    setCurrentView('main');
                                    fetchVehicles();
                                } else {
                                    Alert.alert('Error', data.message || 'Failed to delete vehicle');
                                }
                            }
                        } catch (error) {
                            console.error('Error deleting vehicle:', error);
                            Alert.alert('Error', 'Network error occurred');
                        } finally {
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    const initializeUpdateForm = (vehicle: Vehicle) => {
        setDeletedPhotoIds([]); // Reset deleted photo IDs
        setUpdateVehicleForm({
            make: vehicle.make || '',
            model: vehicle.model || '',
            license_plate: vehicle.license_plate || '',
            color: vehicle.color || '',
            fuel_type: vehicle.fuel_type || '',
            seating_capacity: vehicle.seating_capacity?.toString() || '',
            year: vehicle.year?.toString() || '',
            photos: vehicle.vehicle_photos || [],
            pollution_certificate: null,
            rc_document: null,
            insurance_document: null,
            existing_pollution_certificate: vehicle.pollution_certificate || null,
            existing_rc_document: vehicle.registration_certificate || null,
            existing_insurance_document: vehicle.insurance_certificate || null,
        });
    };

    const pickImage = async (index: number) => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Denied', 'We need camera roll permissions to upload photos');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [16, 9],
            quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
            const newPhotos = [...updateVehicleForm.photos];

            if (index < newPhotos.length) {
                // Update existing photo
                newPhotos[index] = {
                    id: newPhotos[index].id,
                    photo: result.assets[0].uri,
                    uri: result.assets[0].uri,
                    isNew: true,
                };
            } else {
                // Add new photo
                newPhotos.push({
                    id: Date.now(),
                    photo: result.assets[0].uri,
                    uri: result.assets[0].uri,
                    isNew: true,
                });
            }

            setUpdateVehicleForm({ ...updateVehicleForm, photos: newPhotos });
        }
    };

    const removePhoto = (index: number) => {
        if (updateVehicleForm.photos.length <= 1) {
            Alert.alert('Minimum Required', 'At least one photo must be present');
            return;
        }

        Alert.alert(
            'Remove Photo',
            'Are you sure you want to remove this photo?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: () => {
                        const photoToRemove = updateVehicleForm.photos[index];

                        // If it's an existing photo (not new), track its ID for deletion
                        if (!photoToRemove.isNew && photoToRemove.id) {
                            setDeletedPhotoIds(prev => [...prev, photoToRemove.id]);
                        }

                        // Remove from photos array
                        const newPhotos = updateVehicleForm.photos.filter((_, i) => i !== index);
                        setUpdateVehicleForm({ ...updateVehicleForm, photos: newPhotos });
                    }
                }
            ]
        );
    };

    const renderDocumentPreview = (
        type: 'pollution_certificate' | 'rc_document' | 'insurance_document',
        title: string,
        icon: string
    ) => {
        const existingKey = `existing_${type}` as keyof UpdateVehicleForm;
        const newDocument = updateVehicleForm[type];
        const existingDocument = updateVehicleForm[existingKey];

        // Determine what to show
        let displayName = '';
        let statusText = '';

        if (newDocument) {
            displayName = (newDocument as any).name;
            statusText = '✓ New document selected';
        } else if (existingDocument) {
            // Extract filename from URL
            const urlParts = (existingDocument as string).split('/');
            displayName = urlParts[urlParts.length - 1];
            statusText = 'Current document';
        }

        return (
            <View style={styles.documentPreviewContainer}>
                <TouchableOpacity
                    style={styles.updateVehicleDocumentButton}
                    onPress={() => pickDocument(type)}
                >
                    <View style={styles.updateVehicleDocumentIconContainer}>
                        <MaterialCommunityIcons name={icon as any} size={24} color="#008069" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.updateVehicleDocumentTitle}>{title}</Text>
                        {displayName ? (
                            <View style={styles.documentNameContainer}>
                                <Text style={styles.documentNameText} numberOfLines={1}>
                                    {displayName}
                                </Text>
                                <Text style={styles.documentStatusText}>{statusText}</Text>
                            </View>
                        ) : (
                            <Text style={styles.updateVehicleDocumentSubtitle}>
                                Tap to upload document
                            </Text>
                        )}
                    </View>
                    {displayName ? (
                        existingDocument && !newDocument ? (
                            <TouchableOpacity
                                style={styles.documentActionIcon}
                                onPress={() => {
                                    Linking.openURL(existingDocument as string).catch(() => {
                                        Alert.alert('Error', 'Unable to open document');
                                    });
                                }}
                            >
                                <Ionicons name="eye-outline" size={22} color="#008069" />
                            </TouchableOpacity>
                        ) : (
                            <View style={styles.documentActionIcon}>
                                <MaterialIcons name="check-circle" size={22} color="#00d285" />
                            </View>
                        )
                    ) : (
                        <Ionicons name="cloud-upload-outline" size={24} color="#999" />
                    )}
                </TouchableOpacity>
            </View>
        );
    };

    const pickDocument = async (type: 'pollution_certificate' | 'rc_document' | 'insurance_document') => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['application/pdf', 'image/*'],
                copyToCacheDirectory: true,
            });

            // Check if user didn't cancel
            if (!result.canceled && result.assets && result.assets.length > 0) {
                const asset = result.assets[0];
                setUpdateVehicleForm({
                    ...updateVehicleForm,
                    [type]: {
                        uri: asset.uri,
                        name: asset.name,
                        type: asset.mimeType || 'application/pdf',
                    } as Document
                });
            }
        } catch (error) {
            console.error('Error picking document:', error);
            Alert.alert('Error', 'Failed to pick document');
        }
    };

    const submitVehicleUpdate = async () => {
        if (!selectedVehicle) return;

        if (!updateVehicleForm.make || !updateVehicleForm.model || !updateVehicleForm.license_plate) {
            Alert.alert('Error', 'Please fill all required fields');
            return;
        }

        if (updateVehicleForm.photos.length === 0) {
            Alert.alert('Error', 'At least one photo is required');
            return;
        }

        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('token', token || '');
            formData.append('vehicle_id', selectedVehicle.id.toString());
            formData.append('make', updateVehicleForm.make);
            formData.append('model', updateVehicleForm.model);
            formData.append('license_plate', updateVehicleForm.license_plate);
            formData.append('color', updateVehicleForm.color);
            formData.append('fuel_type', updateVehicleForm.fuel_type);
            formData.append('seating_capacity', updateVehicleForm.seating_capacity);
            formData.append('year', updateVehicleForm.year);

            // Add ONLY NEW photos
            updateVehicleForm.photos.forEach((photo, index) => {
                if (photo.isNew && photo.uri) {
                    formData.append('photos', {
                        uri: photo.uri,
                        type: 'image/jpeg',
                        name: `vehicle_photo_${index}.jpg`,
                    } as any);
                }
            });

            // Add deleted photo IDs
            if (deletedPhotoIds.length > 0) {
                formData.append('delete_photo_ids', deletedPhotoIds.join(','));
            }

            // Add documents
            if (updateVehicleForm.pollution_certificate) {
                formData.append('pollution_certificate', updateVehicleForm.pollution_certificate as any);
            }
            if (updateVehicleForm.rc_document) {
                formData.append('rc_document', updateVehicleForm.rc_document as any);
            }
            if (updateVehicleForm.insurance_document) {
                formData.append('insurance_document', updateVehicleForm.insurance_document as any);
            }

            const response = await fetch(`${BACKEND_URL}/manager/updateVehicle`, {
                method: 'POST',
                body: formData,
            });

            const text = await response.text();

            if (text.trim().startsWith('{')) {
                const data = JSON.parse(text);
                if (response.ok) {
                    Alert.alert('Success', 'Vehicle updated successfully!');
                    setDeletedPhotoIds([]); // Reset deleted IDs
                    setCurrentView('main');
                    fetchVehicles();
                } else {
                    Alert.alert('Error', data.message || 'Failed to update vehicle');
                }
            } else {
                Alert.alert('Error', 'Invalid response from server');
            }
        } catch (error) {
            console.error('Error updating vehicle:', error);
            Alert.alert('Error', 'Network error occurred');
        } finally {
            setLoading(false);
        }
    };

    const photos = selectedVehicle?.vehicle_photos || [];

    const renderUpdateVehiclePage = () => (
        <View style={styles.container}>
            {/* Professional Header */}
            <View style={styles.updateVehicleHeader}>
                <View style={styles.updateVehicleHeaderContent}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => setCurrentView('vehicle-detail')}
                    >
                        <View style={styles.backIcon}>
                            <View style={styles.backArrow} />
                            <Text style={styles.backText}>Back</Text>
                        </View>
                    </TouchableOpacity>
                    <View style={styles.updateVehicleHeaderTitleContainer}>
                        <Text style={styles.updateVehicleHeaderTitle}>Update Vehicle</Text>
                    </View>
                    <View style={styles.headerSpacer} />
                </View>
            </View>

            <ScrollView
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.updateVehicleScrollContent}
            >
                {/* Photo Gallery Section */}
                <View style={styles.updateVehicleSection}>
                    <View style={styles.sectionHeaderRow}>
                        <View style={styles.sectionHeaderLeft}>
                            <View style={styles.updateVehicleSectionIconContainer}>
                                <MaterialIcons name="photo-library" size={22} color="#008069" />
                            </View>
                            <View>
                                <Text style={styles.updateVehicleSectionTitle}>Vehicle Photos</Text>
                                <Text style={styles.updateVehicleSectionSubtitle}>
                                    Add up to 6 photos (minimum 1 required)
                                </Text>
                            </View>
                        </View>
                    </View>

                    <ScrollView
                        ref={photoScrollRef}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.photoScrollContent}
                    >
                        {[...Array(6)].map((_, index) => {
                            const photo = updateVehicleForm.photos[index];
                            const hasPhoto = photo !== undefined;
                            return (
                                <TouchableOpacity
                                    key={index}
                                    style={styles.photoSlot}
                                    onPress={() => pickImage(index)}
                                    activeOpacity={0.7}
                                >
                                    {hasPhoto ? (
                                        <>
                                            <Image
                                                source={{ uri: photo.uri || photo.photo }}
                                                style={styles.photoImage}
                                            />
                                            <TouchableOpacity
                                                style={styles.removePhotoButton}
                                                onPress={() => removePhoto(index)}
                                            >
                                                <Ionicons name="close" size={16} color="#fff" />
                                            </TouchableOpacity>
                                            <View style={styles.photoIndexBadge}>
                                                <Text style={styles.photoIndexText}>{index + 1}</Text>
                                            </View>
                                        </>
                                    ) : (
                                        <View style={styles.emptyPhotoSlot}>
                                            <Ionicons name="add" size={32} color="#008069" />
                                            <Text style={styles.addPhotoText}>Add Photo</Text>
                                            <Text style={styles.photoSlotNumber}>{index + 1}</Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>

                {/* Basic Information */}
                <View style={styles.updateVehicleSection}>
                    <View style={styles.sectionHeaderRow}>
                        <View style={styles.sectionHeaderLeft}>
                            <View style={styles.updateVehicleSectionIconContainer}>
                                <MaterialIcons name="info" size={22} color="#008069" />
                            </View>
                            <View>
                                <Text style={styles.updateVehicleSectionTitle}>Basic Information</Text>
                                <Text style={styles.updateVehicleSectionSubtitle}>Required vehicle details</Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>
                            Make <Text style={styles.required}>*</Text>
                        </Text>
                        <View style={styles.inputWrapper}>
                            <TextInput
                                style={styles.input}
                                value={updateVehicleForm.make}
                                onChangeText={(text) =>
                                    setUpdateVehicleForm({ ...updateVehicleForm, make: text })
                                }
                                placeholder="e.g., Toyota"
                                placeholderTextColor="#999"
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>
                            Model <Text style={styles.required}>*</Text>
                        </Text>
                        <View style={styles.inputWrapper}>
                            <TextInput
                                style={styles.input}
                                value={updateVehicleForm.model}
                                onChangeText={(text) =>
                                    setUpdateVehicleForm({ ...updateVehicleForm, model: text })
                                }
                                placeholder="e.g., Camry"
                                placeholderTextColor="#999"
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>
                            License Plate <Text style={styles.required}>*</Text>
                        </Text>
                        <View style={styles.inputWrapper}>
                            <TextInput
                                style={styles.input}
                                value={updateVehicleForm.license_plate}
                                onChangeText={(text) =>
                                    setUpdateVehicleForm({ ...updateVehicleForm, license_plate: text })
                                }
                                placeholder="e.g., ABC-1234"
                                placeholderTextColor="#999"
                                autoCapitalize="characters"
                            />
                        </View>
                    </View>

                    <View style={styles.row}>
                        <View style={[styles.inputGroup, styles.halfWidth, { marginRight: 8 }]}>
                            <Text style={styles.label}>Color</Text>
                            <View style={styles.inputWrapper}>
                                <TextInput
                                    style={styles.input}
                                    value={updateVehicleForm.color}
                                    onChangeText={(text) =>
                                        setUpdateVehicleForm({ ...updateVehicleForm, color: text })
                                    }
                                    placeholder="e.g., White"
                                    placeholderTextColor="#999"
                                />
                            </View>
                        </View>
                        <View style={[styles.inputGroup, styles.halfWidth, { marginLeft: 8 }]}>
                            <Text style={styles.label}>Fuel Type</Text>
                            <View style={styles.inputWrapper}>
                                <TextInput
                                    style={styles.input}
                                    value={updateVehicleForm.fuel_type}
                                    onChangeText={(text) =>
                                        setUpdateVehicleForm({ ...updateVehicleForm, fuel_type: text })
                                    }
                                    placeholder="e.g., Petrol"
                                    placeholderTextColor="#999"
                                />
                            </View>
                        </View>
                    </View>
                </View>

                {/* Vehicle Details */}
                <View style={styles.updateVehicleSection}>
                    <View style={styles.sectionHeaderRow}>
                        <View style={styles.sectionHeaderLeft}>
                            <View style={styles.updateVehicleSectionIconContainer}>
                                <MaterialCommunityIcons name="car-info" size={22} color="#008069" />
                            </View>
                            <View>
                                <Text style={styles.updateVehicleSectionTitle}>Vehicle Specifications</Text>
                                <Text style={styles.updateVehicleSectionSubtitle}>Additional details</Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.row}>
                        <View style={[styles.inputGroup, styles.halfWidth, { marginRight: 8 }]}>
                            <Text style={styles.label}>Seating Capacity</Text>
                            <View style={styles.inputWrapper}>
                                <TextInput
                                    style={styles.input}
                                    value={updateVehicleForm.seating_capacity}
                                    onChangeText={(text) =>
                                        setUpdateVehicleForm({ ...updateVehicleForm, seating_capacity: text })
                                    }
                                    placeholder="e.g., 5"
                                    placeholderTextColor="#999"
                                    keyboardType="numeric"
                                />
                            </View>
                        </View>
                        <View style={[styles.inputGroup, styles.halfWidth, { marginLeft: 8 }]}>
                            <Text style={styles.label}>Year</Text>
                            <View style={styles.inputWrapper}>
                                <TextInput
                                    style={styles.input}
                                    value={updateVehicleForm.year}
                                    onChangeText={(text) =>
                                        setUpdateVehicleForm({ ...updateVehicleForm, year: text })
                                    }
                                    placeholder="e.g., 2023"
                                    placeholderTextColor="#999"
                                    keyboardType="numeric"
                                    maxLength={4}
                                />
                            </View>
                        </View>
                    </View>
                </View>

                {/* Documents Section */}
                <View style={styles.updateVehicleSection}>
                    <View style={styles.sectionHeaderRow}>
                        <View style={styles.sectionHeaderLeft}>
                            <View style={styles.updateVehicleSectionIconContainer}>
                                <MaterialCommunityIcons name="file-document" size={22} color="#008069" />
                            </View>
                            <View>
                                <Text style={styles.updateVehicleSectionTitle}>Vehicle Documents</Text>
                                <Text style={styles.updateVehicleSectionSubtitle}>
                                    Upload new or view existing documents
                                </Text>
                            </View>
                        </View>
                    </View>

                    {renderDocumentPreview('pollution_certificate', 'Pollution Certificate', 'leaf')}
                    {renderDocumentPreview('rc_document', 'RC Document', 'card-account-details')}
                    {renderDocumentPreview('insurance_document', 'Insurance Document', 'shield-check')}
                </View>
            </ScrollView>

            {/* Fixed Bottom Button */}
            <View style={styles.updateVehicleBottomContainer}>
                <TouchableOpacity
                    style={[styles.updateButton, loading && styles.updateButtonDisabled]}
                    onPress={submitVehicleUpdate}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                        <>
                            <Ionicons name="checkmark-circle" size={22} color="#FFFFFF" />
                            <Text style={styles.updateButtonText}>Update Vehicle</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderVehicleDetailPage = () => (
        <View style={styles.container}>
            <View style={styles.detailHeader}>
                <TouchableOpacity
                    style={styles.detailBackButton}
                    onPress={() => setCurrentView('main')}
                >
                    <View style={styles.backIcon}>
                        <View style={styles.backArrow} />
                        <Text style={styles.backText}>Back</Text>
                    </View>
                </TouchableOpacity>
                <Text style={styles.detailHeaderTitle}>Vehicle Details</Text>
                <View style={styles.detailHeaderSpacer}>
                    <TouchableOpacity
                        style={{ padding: 8 }}
                        onPress={() => {
                            if (selectedVehicle) {
                                initializeUpdateForm(selectedVehicle);
                                setCurrentView('update-vehicle');
                            }
                        }}
                    >
                        <MaterialIcons name="edit" size={24} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={{ padding: 8 }}
                        onPress={() => selectedVehicle && handleDeleteVehicle(selectedVehicle.id)}
                    >
                        <MaterialIcons name="delete" size={24} color="#fff" />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView style={styles.detailPageContainer} showsVerticalScrollIndicator={false}>
                {selectedVehicle && (
                    <View style={styles.detailPageContent}>
                        <View style={styles.vehiclePhotoCard}>
                            {/* Photo Gallery */}
                            <ScrollView
                                ref={scrollViewRef}
                                horizontal
                                pagingEnabled
                                showsHorizontalScrollIndicator={false}
                                onScroll={handleScroll}
                                scrollEventThrottle={16}
                                decelerationRate="fast"
                                snapToInterval={CARD_WIDTH}
                                snapToAlignment="center"
                                contentContainerStyle={styles.scrollViewContent}
                            >
                                {photos.map((photo, index) => (
                                    <View key={photo.id} style={styles.photoContainer}>
                                        <Image
                                            source={{ uri: photo.photo }}
                                            style={styles.photo}
                                            resizeMode="cover"
                                        />
                                    </View>
                                ))}
                            </ScrollView>

                            {/* Pagination Dots */}
                            {photos.length > 1 && (
                                <View style={styles.pagination}>
                                    {photos.map((_, index) => (
                                        <View
                                            key={index}
                                            style={[
                                                styles.dot,
                                                activeIndex === index ? styles.activeDot : styles.inactiveDot
                                            ]}
                                        />
                                    ))}
                                </View>
                            )}
                        </View>

                        <View style={styles.vehicleDetailHeaderCard}>
                            <View style={styles.vehicleDetailHeader}>
                                <View style={styles.vehicleIconContainer}>
                                    <MaterialCommunityIcons
                                        name="car"
                                        size={30}
                                        color="#075E54"
                                    />
                                </View>

                                <View style={styles.vehicleDetailInfo}>
                                    <Text style={styles.vehicleModelText}>
                                        {selectedVehicle.make} {selectedVehicle.model}
                                    </Text>
                                    <Text style={styles.vehiclePlateText}>{selectedVehicle.license_plate}</Text>
                                    <View style={styles.vehicleMeta}>
                                        <View style={styles.metaChip}>
                                            <MaterialCommunityIcons name="palette" size={12} color="#008069" />
                                            <Text style={styles.metaChipText}>{selectedVehicle.color}</Text>
                                        </View>
                                        <View style={styles.metaChip}>
                                            <MaterialCommunityIcons name="fuel" size={12} color="#008069" />
                                            <Text style={styles.metaChipText}>{selectedVehicle.fuel_type}</Text>
                                        </View>
                                    </View>
                                </View>
                            </View>
                        </View>

                        <View style={styles.infoCard}>
                            <View style={styles.cardHeader}>
                                <MaterialCommunityIcons name="car-info" size={20} color="#008069" />
                                <Text style={styles.cardTitle}>Vehicle Details</Text>
                            </View>
                            <View style={styles.infoGrid}>
                                <View style={styles.infoRow}>
                                    <MaterialCommunityIcons name="car-door" size={18} color="#666" />
                                    <Text style={styles.infoLabel}>Seating:</Text>
                                    <Text style={styles.infoValue}>{selectedVehicle.seating_capacity} seats</Text>
                                </View>
                                <View style={styles.infoRow}>
                                    <MaterialIcons name="calendar-today" size={18} color="#666" />
                                    <Text style={styles.infoLabel}>Year:</Text>
                                    <Text style={styles.infoValue}>{selectedVehicle.year}</Text>
                                </View>
                                <View style={styles.infoRow}>
                                    <MaterialIcons name="location-on" size={18} color="#666" />
                                    <Text style={styles.infoLabel}>Location:</Text>
                                    <Text style={styles.infoValue}>
                                        {selectedVehicle.current_location?.city || 'Unknown'}, {selectedVehicle.current_location?.state || ''}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        <View style={styles.infoCard}>
                            <View style={styles.cardHeader}>
                                <MaterialCommunityIcons name="file-document" size={20} color="#008069" />
                                <Text style={styles.cardTitle}>Vehicle Documents</Text>
                            </View>
                            <View style={styles.documentsContainer}>
                                {selectedVehicle.pollution_certificate && (
                                    <TouchableOpacity
                                        style={styles.documentDownloadButton}
                                        onPress={() => {
                                            if (selectedVehicle.pollution_certificate) {
                                                Linking.openURL(selectedVehicle.pollution_certificate).catch(err => {
                                                    Alert.alert('Error', 'Unable to open document');
                                                    console.error('Error opening URL:', err);
                                                });
                                            }
                                        }}
                                    >
                                        <View style={styles.documentIconWrapper}>
                                            <MaterialCommunityIcons name="leaf" size={24} color="#00d285" />
                                        </View>
                                        <View style={styles.documentTextContainer}>
                                            <Text style={styles.documentTitle}>Pollution Certificate</Text>
                                            <Text style={styles.documentSubtitle}>Tap to view</Text>
                                        </View>
                                        <Ionicons name="open-outline" size={24} color="#008069" style={{ marginLeft: 45 }} />
                                    </TouchableOpacity>
                                )}

                                {selectedVehicle.insurance_certificate && (
                                    <TouchableOpacity
                                        style={styles.documentDownloadButton}
                                        onPress={() => {
                                            if (selectedVehicle.insurance_certificate) {
                                                Linking.openURL(selectedVehicle.insurance_certificate).catch(err => {
                                                    Alert.alert('Error', 'Unable to open document');
                                                    console.error('Error opening URL:', err);
                                                });
                                            }
                                        }}
                                    >
                                        <View style={styles.documentIconWrapper}>
                                            <MaterialCommunityIcons name="shield-check" size={24} color="#FF9500" />
                                        </View>
                                        <View style={styles.documentTextContainer}>
                                            <Text style={styles.documentTitle}>Insurance Certificate</Text>
                                            <Text style={styles.documentSubtitle}>Tap to view</Text>
                                        </View>
                                        <Ionicons name="open-outline" size={24} color="#008069" style={{ marginLeft: 40 }} />
                                    </TouchableOpacity>
                                )}

                                {selectedVehicle.registration_certificate && (
                                    <TouchableOpacity
                                        style={styles.documentDownloadButton}
                                        onPress={() => {
                                            if (selectedVehicle.registration_certificate) {
                                                Linking.openURL(selectedVehicle.registration_certificate).catch(err => {
                                                    Alert.alert('Error', 'Unable to open document');
                                                    console.error('Error opening URL:', err);
                                                });
                                            }
                                        }}
                                    >
                                        <View style={styles.documentIconWrapper}>
                                            <MaterialCommunityIcons name="card-account-details" size={24} color="#008069" />
                                        </View>
                                        <View style={styles.documentTextContainer}>
                                            <Text style={styles.documentTitle}>Registration Certificate</Text>
                                            <Text style={styles.documentSubtitle}>Tap to view</Text>
                                        </View>
                                        <Ionicons name="open-outline" size={24} color="#008069" style={{ marginLeft: 25 }} />
                                    </TouchableOpacity>
                                )}

                                {!selectedVehicle.pollution_certificate &&
                                    !selectedVehicle.insurance_certificate &&
                                    !selectedVehicle.registration_certificate && (
                                        <View style={styles.noDocumentsContainer}>
                                            <MaterialCommunityIcons name="file-alert-outline" size={48} color="#CBD5E0" />
                                            <Text style={styles.noDocumentsText}>No documents available</Text>
                                            <Text style={styles.noDocumentsSubtext}>Upload documents in the update section</Text>
                                        </View>
                                    )}
                            </View>
                        </View>


                        <View style={styles.infoCard}>
                            <View style={styles.cardHeader}>
                                <MaterialIcons name="update" size={20} color="#008069" />
                                <Text style={styles.cardTitle}>Update Status</Text>
                            </View>
                            <View style={styles.statusOptions}>
                                {['available', 'not_available', 'in_maintenance'].map((status) => {
                                    let buttonColor = '#8E8E93';
                                    if (status === 'available') buttonColor = '#00d285';
                                    if (status === 'not_available') buttonColor = '#FF3B30';
                                    if (status === 'in_maintenance') buttonColor = '#FF9500';

                                    return (
                                        <TouchableOpacity
                                            key={status}
                                            style={[
                                                styles.statusOption,
                                                vehicleStatus === status && styles.statusOptionSelected,
                                                vehicleStatus === status && { backgroundColor: buttonColor }
                                            ]}
                                            onPress={() => setVehicleStatus(status)}
                                        >
                                            <Ionicons
                                                name={getStatusIcon(status)}
                                                size={20}
                                                color={vehicleStatus === status ? '#FFFFFF' : buttonColor}
                                            />
                                            <Text
                                                style={[
                                                    styles.statusOptionText,
                                                    vehicleStatus === status && styles.statusOptionTextSelected,
                                                    vehicleStatus === status && { color: '#FFFFFF' }
                                                ]}
                                            >
                                                {status.replace('_', ' ').toUpperCase()}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                            <TouchableOpacity
                                style={styles.updateButton}
                                onPress={updateVehicleStatus}
                                disabled={loading}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#FFFFFF" size="small" />
                                ) : (
                                    <>
                                        <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                                        <Text style={styles.updateButtonText}>Update Status</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>

                        <View style={styles.actionButtonsContainer}>
                            <TouchableOpacity style={styles.actionButton} onPress={() => setIsMaintenanceModalVisible(true)}>
                                <MaterialCommunityIcons name="toolbox" size={24} color="#008069" />
                                <Text style={styles.actionButtonText}>Maintenance</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.actionButton} onPress={() => setIsFuelLogModalVisible(true)}>
                                <MaterialCommunityIcons name="fuel" size={24} color="#008069" />
                                <Text style={styles.actionButtonText}>Fuel Log</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.actionButton} onPress={() => selectedVehicle && fetchMaintenanceLogs(selectedVehicle.id)}>
                                <MaterialCommunityIcons name="history" size={24} color="#008069" />
                                <Text style={styles.actionButtonText}>Logs</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.actionButton} onPress={() => selectedVehicle && fetchFuelLogs(selectedVehicle.id)}>
                                <MaterialCommunityIcons name="gas-station" size={24} color="#008069" />
                                <Text style={styles.actionButtonText}>Fuel History</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </ScrollView>
        </View>
    );

    const renderVehicleCard = ({ item }: { item: Vehicle }) => {
        const vehicleImageUrl = item.vehicle_photos && item.vehicle_photos.length > 0
            ? item.vehicle_photos[0].photo
            : 'https://images.unsplash.com/photo-1553440569-bcc63803a83d?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80';

        return (
            <TouchableOpacity
                style={styles.cabCard}
                onPress={() => {
                    setSelectedVehicle(item);
                    setVehicleStatus(item.status);
                    setCurrentView('vehicle-detail');
                }}
                activeOpacity={0.7}
            >
                <Image
                    source={{ uri: vehicleImageUrl }}
                    style={styles.cabImage}
                />
                <View style={styles.cabInfo}>
                    <Text style={styles.cabName}>{item.make} {item.model}</Text>
                    <Text style={styles.cabMeta}>
                        {item.license_plate} • {item.color} • {item.year}
                    </Text>
                    <View style={styles.cabSpecs}>
                        <View style={styles.specItem}>
                            <MaterialCommunityIcons name="gas-station" size={14} color="#008069" />
                            <Text style={styles.specText}>{item.fuel_type}</Text>
                        </View>
                        <View style={styles.specItem}>
                            <MaterialCommunityIcons name="seat-passenger" size={14} color="#008069" />
                            <Text style={styles.specText}>{item.seating_capacity} Seats</Text>
                        </View>
                    </View>
                    <View style={styles.vehicleFooter}>
                        <View style={[styles.vehicleStatusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                            <Text style={styles.vehicleStatusText}>{item.status.replace('_', ' ').toUpperCase()}</Text>
                        </View>
                        <Text style={styles.vehicleLocation}>
                            <MaterialIcons name="location-on" size={12} color="#666" /> {item.current_location?.city || 'Unknown'}
                        </Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    const renderMainView = () => (
        <View style={styles.screenContainer}>
            <ScrollView
                style={styles.scrollContainer}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={[styles.header, styles.headerBanner]}>
                    <LinearGradient
                        colors={['#075E54', '#128C7E']}
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
                                    <View style={styles.backIcon}>
                                        <View style={styles.backArrow} />
                                        <Text style={styles.backText}>Back</Text>
                                    </View>
                                </TouchableOpacity>
                                <View style={styles.headerCenter}>
                                    <Text style={styles.logoText}>CITADEL</Text>
                                    <Text style={styles.headerSubtitle}>Managing: {city}</Text>
                                </View>
                                <TouchableOpacity
                                    style={{ padding: 8 }}
                                    onPress={() => {
                                        // Navigate to create car screen
                                        // You would implement this navigation
                                    }}
                                >
                                    <MaterialIcons name="add" size={24} color="#fff" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.titleSection}>
                            <Text style={styles.headerTitle}>Vehicles</Text>
                            <Text style={styles.headerSubtitle}>
                                {vehicles.length} vehicle{vehicles.length !== 1 ? 's' : ''} in {city}
                            </Text>
                        </View>
                    </LinearGradient>
                </View>

                <View style={styles.tabContainer}>
                    <TouchableOpacity
                        style={[styles.tabButton, activeTab === 'vehicles' && styles.activeTabButton]}
                        onPress={() => setActiveTab('vehicles')}
                    >
                        <MaterialCommunityIcons
                            name="car"
                            size={24}
                            color={activeTab === 'vehicles' ? '#075E54' : '#666'}
                        />
                        <Text style={[styles.tabText, activeTab === 'vehicles' && styles.activeTabText]}>
                            Vehicles ({vehicles.length})
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.tabButton, activeTab === 'bookings' && styles.activeTabButton]}
                        onPress={() => setActiveTab('bookings')}
                    >
                        <MaterialIcons
                            name="bookmarks"
                            size={24}
                            color={activeTab === 'bookings' ? '#075E54' : '#666'}
                        />
                        <Text style={[styles.tabText, activeTab === 'bookings' && styles.activeTabText]}>
                            Bookings
                        </Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.cabsListContent}>
                    {loading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color="#075E54" />
                            <Text style={styles.loadingText}>Loading vehicles...</Text>
                        </View>
                    ) : vehicles.length === 0 ? (
                        <View style={styles.emptyStateContainer}>
                            <View style={styles.emptyStateCard}>
                                <View style={styles.emptyIconContainer}>
                                    <MaterialCommunityIcons
                                        name="car-off"
                                        size={64}
                                        color="#CBD5E0"
                                    />
                                </View>
                                <Text style={styles.emptyStateTitle}>No Vehicles Found</Text>
                                <Text style={styles.emptyStateMessage}>
                                    No vehicles found for {city}.
                                </Text>
                                <TouchableOpacity
                                    style={styles.searchBtn}
                                    onPress={() => {
                                        // Navigate to create car screen
                                    }}
                                >
                                    <Text style={styles.searchBtnText}>Add First Vehicle</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ) : (
                        <FlatList
                            data={vehicles}
                            renderItem={renderVehicleCard}
                            keyExtractor={(item) => item.id.toString()}
                            scrollEnabled={false}
                            showsVerticalScrollIndicator={false}
                        />
                    )}
                </View>
            </ScrollView>
        </View>
    );

    const renderContent = () => {
        switch (currentView) {
            case 'vehicle-detail':
                return renderVehicleDetailPage();
            case 'update-vehicle':
                return renderUpdateVehiclePage();
            default:
                return renderMainView();
        }
    };

    return (
        <>
            {renderContent()}

            <MaintenanceModal
                isVisible={isMaintenanceModalVisible}
                onClose={() => setIsMaintenanceModalVisible(false)}
                onSubmit={submitMaintenance}
                form={maintenanceForm}
                setForm={setMaintenanceForm}
                loading={loading}
            />

            <FuelLogModal
                isVisible={isFuelLogModalVisible}
                onClose={() => setIsFuelLogModalVisible(false)}
                onSubmit={submitFuelLog}
                form={fuelLogForm}
                setForm={setFuelLogForm}
                loading={loading}
            />

            <MaintenanceLogsModal
                isVisible={isMaintenanceLogsModalVisible}
                onClose={() => setIsMaintenanceLogsModalVisible(false)}
                logs={maintenanceLogs}
                formatDate={formatDate}
            />

            <FuelLogsModal
                isVisible={isFuelLogsModalVisible}
                onClose={() => setIsFuelLogsModalVisible(false)}
                logs={fuelLogs}
                formatDateTime={formatDate}
            />
        </>
    );
};

export default Vehicles;