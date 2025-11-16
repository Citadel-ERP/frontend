import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    StatusBar, Alert, Modal, TextInput, Dimensions, ActivityIndicator,
    Image, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { BACKEND_URL } from '../config/config';

const { width: screenWidth } = Dimensions.get('window');

interface CreateSiteProps {
    onBack: () => void;
    colors: any;
    spacing: any;
    fontSize: any;
    borderRadius: any;
    shadows: any;
}

const CreateSite: React.FC<CreateSiteProps> = ({
    onBack,
    colors,
    spacing,
    fontSize,
    borderRadius,
    shadows,
}) => {
    const [currentStep, setCurrentStep] = useState(1);
    const [token, setToken] = useState<string | null>(null);
    const [creatingSite, setCreatingSite] = useState(false);
    const [showBuildingStatusDropdown, setShowBuildingStatusDropdown] = useState(false);
    const [showFloorConditionDropdown, setShowFloorConditionDropdown] = useState(false);
    const [showImageSourceModal, setShowImageSourceModal] = useState(false);
    const [newSite, setNewSite] = useState({
        building_name: '',
        location: '',
        landmark: '',
        total_floors: '',
        number_of_basements: '',
        floor_condition: 'bareshell',
        area_per_floor: '',
        total_area: '',
        availble_floors: '',
        car_parking_charges: '',
        car_parking_ratio_left: '',
        car_parking_ratio_right: '',
        car_parking_slots: '',
        building_status: 'available',
        rent: '',
        cam: '',
        cam_deposit: '',
        oc: false,
        rental_escalation: '',
        security_deposit: '',
        two_wheeler_slots: '',
        two_wheeler_charges: '',
        efficiency: '',
        notice_period: '',
        lease_term: '',
        lock_in_period: '',
        will_developer_do_fitouts: false,
        contact_person_name: '',
        contact_person_designation: '',
        contact_person_number: '',
        contact_person_email: '',
        power: '',
        power_backup: '',
        number_of_cabins: '',
        number_of_workstations: '',
        size_of_workstation: '',
        server_room: '',
        training_room: '',
        pantry: '',
        electrical_ups_room: '',
        cafeteria: '',
        gym: '',
        discussion_room: '',
        meeting_room: '',
        remarks: '',
        building_owner_name: '',
        building_owner_contact: '',
    });

    const [buildingPhotos, setBuildingPhotos] = useState<Array<{ id: number; uri: string; type: string }>>([]);

    const TOKEN_KEY = 'token_2';

    const BUILDING_STATUS_OPTIONS = [
        { label: 'Available', value: 'available' },
        { label: 'Leased Out', value: 'leased_out' },
        { label: 'Readily Available', value: 'readily_available' },
        { label: 'Ready to Move In', value: 'ready_to_move_in' },
        { label: 'Ready for Fitouts', value: 'ready_for_fitouts' },
    ];

    const FLOOR_CONDITION_OPTIONS = [
        { label: 'Bareshell', value: 'bareshell' },
        { label: 'Warmshell', value: 'warmshell' },
        { label: 'Fully Furnished', value: 'fully_furnished' },
        { label: 'Semi Furnished', value: 'semi_furnished' },
    ];

    const beautifyName = (name: string): string => {
        if (!name) return '-';
        return name
            .split('_')
            .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    };

    const formatCurrency = (value: string): string => {
        const numStr = value.replace(/[^0-9]/g, '');
        if (!numStr) return '';
        const num = parseInt(numStr);
        return num.toLocaleString('en-IN');
    };

    const parseCurrency = (formatted: string): string => {
        return formatted.replace(/,/g, '');
    };

    const captureLocation = async () => {
        try {
            const mockLat = 28.6139 + Math.random() * 0.01;
            const mockLng = 77.2090 + Math.random() * 0.01;
            return {
                latitude: mockLat.toFixed(6),
                longitude: mockLng.toFixed(6),
            };
        } catch (error) {
            console.error('Location capture error:', error);
            return null;
        }
    };

    const validateStep = (step: number): boolean => {
        if (step === 1) {
            if (!newSite.building_name || !newSite.location) {
                Alert.alert('Required Fields', 'Please fill in Building Name and Location');
                return false;
            }
        }
        return true;
    };

    const handleNextStep = () => {
        if (validateStep(currentStep)) {
            setCurrentStep(currentStep + 1);
        }
    };

    const handlePrevStep = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        }
    };

    const requestPermissions = async () => {
        try {
            const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
            const mediaPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
            
            if (cameraPermission.status !== 'granted' || mediaPermission.status !== 'granted') {
                Alert.alert(
                    'Permissions Required',
                    'Camera and gallery permissions are required to upload photos. Please enable them in Settings.',
                    [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Open Settings', onPress: () => {
                            if (Platform.OS === 'ios') {
                                ImagePicker.requestMediaLibraryPermissionsAsync();
                            }
                        }}
                    ]
                );
                return false;
            }
            return true;
        } catch (error) {
            console.error('Permission request error:', error);
            Alert.alert('Error', 'Failed to request permissions');
            return false;
        }
    };

    const handleAddPhoto = () => {
        setShowImageSourceModal(true);
    };

    const pickImageFromCamera = async () => {
        setShowImageSourceModal(false);
        
        await new Promise(resolve => setTimeout(resolve, 300));
        
        try {
            const { status } = await ImagePicker.getCameraPermissionsAsync();
            
            if (status !== 'granted') {
                const { status: newStatus } = await ImagePicker.requestCameraPermissionsAsync();
                if (newStatus !== 'granted') {
                    Alert.alert('Permission Denied', 'Camera permission is required to take photos.');
                    return;
                }
            }

            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.8,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const asset = result.assets[0];
                const newPhoto = {
                    id: Date.now(),
                    uri: asset.uri,
                    type: asset.type || 'image/jpeg'
                };
                setBuildingPhotos(prev => [...prev, newPhoto]);
            }
        } catch (error) {
            console.error('Camera error:', error);
            Alert.alert('Error', 'Failed to capture image from camera');
        }
    };

    const pickImageFromGallery = async () => {
        setShowImageSourceModal(false);
        
        await new Promise(resolve => setTimeout(resolve, 300));
        
        try {
            const { status } = await ImagePicker.getMediaLibraryPermissionsAsync();
            
            if (status !== 'granted') {
                const { status: newStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                if (newStatus !== 'granted') {
                    Alert.alert('Permission Denied', 'Gallery permission is required to select photos. Please enable it in Settings.');
                    return;
                }
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: false,
                quality: 0.8,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const asset = result.assets[0];
                const newPhoto = {
                    id: Date.now(),
                    uri: asset.uri,
                    type: asset.type || 'image/jpeg'
                };
                setBuildingPhotos(prev => [...prev, newPhoto]);
            }
        } catch (error) {
            console.error('Gallery error:', error);
            Alert.alert('Error', 'Failed to pick image from gallery. Please try again.');
        }
    };

    const handleCreateSite = async () => {
        if (!validateStep(currentStep)) return;

        setCreatingSite(true);
        try {
            const storedToken = await AsyncStorage.getItem(TOKEN_KEY);
            if (!storedToken) {
                Alert.alert('Error', 'Token not found. Please login again.');
                setCreatingSite(false);
                return;
            }

            const locationData = await captureLocation();
            if (!locationData) {
                Alert.alert('Error', 'Failed to capture location. Please try again.');
                setCreatingSite(false);
                return;
            }

            const siteData: any = {
                token: storedToken,
                building_name: newSite.building_name,
                latitude: parseFloat(locationData.latitude),
                longitude: parseFloat(locationData.longitude),
            };

            if (newSite.location) siteData.location = newSite.location;
            if (newSite.landmark) siteData.landmark = newSite.landmark;
            if (newSite.rent) siteData.rent = parseCurrency(newSite.rent);
            if (newSite.building_status) siteData.building_status = newSite.building_status;
            if (newSite.total_area) siteData.total_area = parseCurrency(newSite.total_area);
            if (newSite.area_per_floor) siteData.area_per_floor = parseCurrency(newSite.area_per_floor);
            if (newSite.availble_floors) siteData.availble_floors = newSite.availble_floors;

            if (newSite.car_parking_ratio_left && newSite.car_parking_ratio_right) {
                siteData.car_parking_ratio = `${newSite.car_parking_ratio_left}:${newSite.car_parking_ratio_right}`;
            }

            if (newSite.contact_person_name) siteData.contact_person_name = newSite.contact_person_name;
            if (newSite.contact_person_number) siteData.contact_person_number = newSite.contact_person_number;
            if (newSite.contact_person_email) siteData.contact_person_email = newSite.contact_person_email;
            if (newSite.contact_person_designation) siteData.contact_person_designation = newSite.contact_person_designation;

            if (newSite.total_floors) siteData.total_floors = newSite.total_floors;
            if (newSite.number_of_basements) siteData.number_of_basements = newSite.number_of_basements;
            if (newSite.floor_condition) siteData.floor_condition = newSite.floor_condition;

            if (newSite.car_parking_charges) siteData.car_parking_charges = parseCurrency(newSite.car_parking_charges);
            if (newSite.car_parking_slots) siteData.car_parking_slots = newSite.car_parking_slots;
            if (newSite.two_wheeler_slots) siteData.two_wheeler_slots = newSite.two_wheeler_slots;
            if (newSite.two_wheeler_charges) siteData.two_wheeler_charges = parseCurrency(newSite.two_wheeler_charges);

            if (newSite.cam) siteData.cam = parseCurrency(newSite.cam);
            if (newSite.cam_deposit) siteData.cam_deposit = parseCurrency(newSite.cam_deposit);
            if (newSite.security_deposit) siteData.security_deposit = parseCurrency(newSite.security_deposit);

            if (newSite.oc !== undefined && newSite.oc !== null) {
                siteData.oc = newSite.oc ? 'True' : 'False';
            }
            if (newSite.will_developer_do_fitouts !== undefined && newSite.will_developer_do_fitouts !== null) {
                siteData.will_developer_do_fitouts = newSite.will_developer_do_fitouts ? 'True' : 'False';
            }

            if (newSite.rental_escalation) siteData.rental_escalation = newSite.rental_escalation;
            if (newSite.efficiency) siteData.efficiency = newSite.efficiency;

            if (newSite.notice_period) siteData.notice_period = newSite.notice_period;
            if (newSite.lease_term) siteData.lease_term = newSite.lease_term;
            if (newSite.lock_in_period) siteData.lock_in_period = newSite.lock_in_period;

            if (newSite.power) siteData.power = newSite.power;
            if (newSite.power_backup) siteData.power_backup = newSite.power_backup;

            if (newSite.number_of_cabins) siteData.number_of_cabins = newSite.number_of_cabins;
            if (newSite.number_of_workstations) siteData.number_of_workstations = newSite.number_of_workstations;
            if (newSite.size_of_workstation) siteData.size_of_workstation = newSite.size_of_workstation;

            if (newSite.server_room) siteData.server_room = newSite.server_room;
            if (newSite.training_room) siteData.training_room = newSite.training_room;
            if (newSite.pantry) siteData.pantry = newSite.pantry;
            if (newSite.electrical_ups_room) siteData.electrical_ups_room = newSite.electrical_ups_room;
            if (newSite.cafeteria) siteData.cafeteria = newSite.cafeteria;
            if (newSite.gym) siteData.gym = newSite.gym;
            if (newSite.discussion_room) siteData.discussion_room = newSite.discussion_room;
            if (newSite.meeting_room) siteData.meeting_room = newSite.meeting_room;

            if (newSite.remarks) siteData.remarks = newSite.remarks;
            if (newSite.building_owner_name) siteData.building_owner_name = newSite.building_owner_name;
            if (newSite.building_owner_contact) siteData.building_owner_contact = newSite.building_owner_contact;

            const formData = new FormData();
            Object.entries(siteData).forEach(([key, value]) => {
                if (value !== null && value !== undefined) {
                    formData.append(key, String(value));
                }
            });

            buildingPhotos.forEach((photo, idx) => {
                const fileName = `photo_${idx + 1}_${photo.id}.jpg`;
                formData.append('photos', {
                    uri: photo.uri,
                    type: 'image/jpeg',
                    name: fileName,
                } as any);
            });

            const response = await fetch(`${BACKEND_URL}/employee/createSite`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to create site');
            }

            Alert.alert(
                'Success',
                `Site created successfully!\nLocation: ${locationData.latitude}, ${locationData.longitude}`
            );
            onBack();
        } catch (error) {
            console.error('Site creation error:', error);
            Alert.alert('Error', error instanceof Error ? error.message : 'Failed to create site');
        } finally {
            setCreatingSite(false);
        }
    };

    const BackIcon = () => (
        <View style={styles(colors, spacing, borderRadius).backIcon}>
            <View style={styles(colors, spacing, borderRadius).backArrow} />
        </View>
    );

    const renderStepIndicator = () => (
        <View style={styles(colors, spacing, borderRadius).stepIndicator}>
            {[1, 2, 3, 4, 5, 6].map((step, index) => (
                <View key={step} style={styles(colors, spacing, borderRadius).stepIndicatorItem}>
                    <View style={[
                        styles(colors, spacing, borderRadius).stepCircle,
                        currentStep >= step && styles(colors, spacing, borderRadius).stepCircleActive
                    ]}>
                        <Text style={[
                            styles(colors, spacing, borderRadius).stepNumber,
                            currentStep >= step && styles(colors, spacing, borderRadius).stepNumberActive
                        ]}>
                            {step}
                        </Text>
                    </View>
                    {index < 5 && (
                        <View style={[
                            styles(colors, spacing, borderRadius).stepLine,
                            currentStep > step && styles(colors, spacing, borderRadius).stepLineActive
                        ]} />
                    )}
                </View>
            ))}
        </View>
    );

    const renderStep1 = () => (
        <View style={styles(colors, spacing, borderRadius).stepContent}>
            <Text style={styles(colors, fontSize).stepTitle}>🏢 Basic Information</Text>
            <Text style={styles(colors, fontSize).stepDescription}>Essential property details</Text>

            <View style={styles(colors, spacing).formGroup}>
                <Text style={styles(colors, fontSize).formLabel}>Building Name *</Text>
                <TextInput
                    style={styles(colors, spacing, borderRadius).input}
                    value={newSite.building_name}
                    onChangeText={(val) => setNewSite({ ...newSite, building_name: val })}
                    placeholder="Enter building name"
                    placeholderTextColor={colors.textSecondary}
                />
            </View>

            <View style={styles(colors, spacing).formGroup}>
                <Text style={styles(colors, fontSize).formLabel}>Location *</Text>
                <TextInput
                    style={styles(colors, spacing, borderRadius).input}
                    value={newSite.location}
                    onChangeText={(val) => setNewSite({ ...newSite, location: val })}
                    placeholder="Enter location"
                    placeholderTextColor={colors.textSecondary}
                />
            </View>

            <View style={styles(colors, spacing).formGroup}>
                <Text style={styles(colors, fontSize).formLabel}>Landmark</Text>
                <TextInput
                    style={styles(colors, spacing, borderRadius).input}
                    value={newSite.landmark}
                    onChangeText={(val) => setNewSite({ ...newSite, landmark: val })}
                    placeholder="Nearby landmark"
                    placeholderTextColor={colors.textSecondary}
                />
            </View>
        </View>
    );

    const renderStep2 = () => (
        <View style={styles(colors, spacing, borderRadius).stepContent}>
            <Text style={styles(colors, fontSize).stepTitle}>📐 Property Specifications</Text>
            <Text style={styles(colors, fontSize).stepDescription}>Area and floor details</Text>

            <View style={styles(colors, spacing).row}>
                <View style={styles(colors, spacing).halfWidth}>
                    <Text style={styles(colors, fontSize).formLabel}>Total Floors</Text>
                    <TextInput
                        style={styles(colors, spacing, borderRadius).input}
                        value={newSite.total_floors}
                        onChangeText={(val) => setNewSite({ ...newSite, total_floors: val })}
                        placeholder="10"
                        keyboardType="numeric"
                        placeholderTextColor={colors.textSecondary}
                    />
                </View>
                <View style={styles(colors, spacing).halfWidth}>
                    <Text style={styles(colors, fontSize).formLabel}>Basements</Text>
                    <TextInput
                        style={styles(colors, spacing, borderRadius).input}
                        value={newSite.number_of_basements}
                        onChangeText={(val) => setNewSite({ ...newSite, number_of_basements: val })}
                        placeholder="2"
                        keyboardType="numeric"
                        placeholderTextColor={colors.textSecondary}
                    />
                </View>
            </View>

            <View style={styles(colors, spacing).formGroup}>
                <Text style={styles(colors, fontSize).formLabel}>Floor Condition</Text>
                <TouchableOpacity
                    style={styles(colors, spacing, borderRadius).dropdownButton}
                    onPress={() => setShowFloorConditionDropdown(true)}
                >
                    <Text style={styles(colors, fontSize).dropdownButtonText}>
                        {beautifyName(newSite.floor_condition)}
                    </Text>
                    <Text style={styles(colors, fontSize).dropdownButtonIcon}>▼</Text>
                </TouchableOpacity>
            </View>

            <View style={styles(colors, spacing).row}>
                <View style={styles(colors, spacing).halfWidth}>
                    <Text style={styles(colors, fontSize).formLabel}>Total Area (sq ft)</Text>
                    <TextInput
                        style={styles(colors, spacing, borderRadius).input}
                        value={newSite.total_area}
                        onChangeText={(val) => setNewSite({ ...newSite, total_area: formatCurrency(val) })}
                        placeholder="50,000"
                        keyboardType="numeric"
                        placeholderTextColor={colors.textSecondary}
                    />
                </View>
                <View style={styles(colors, spacing).halfWidth}>
                    <Text style={styles(colors, fontSize).formLabel}>Area/Floor (sq ft)</Text>
                    <TextInput
                        style={styles(colors, spacing, borderRadius).input}
                        value={newSite.area_per_floor}
                        onChangeText={(val) => setNewSite({ ...newSite, area_per_floor: formatCurrency(val) })}
                        placeholder="5,000"
                        keyboardType="numeric"
                        placeholderTextColor={colors.textSecondary}
                    />
                </View>
            </View>

            <View style={styles(colors, spacing).formGroup}>
                <Text style={styles(colors, fontSize).formLabel}>Available Floors</Text>
                <TextInput
                    style={styles(colors, spacing, borderRadius).input}
                    value={newSite.availble_floors}
                    onChangeText={(val) => setNewSite({ ...newSite, availble_floors: val })}
                    placeholder="G+1 to G+5"
                    placeholderTextColor={colors.textSecondary}
                />
            </View>

            <View style={styles(colors, spacing).formGroup}>
                <Text style={styles(colors, fontSize).formLabel}>Efficiency (%)</Text>
                <TextInput
                    style={styles(colors, spacing, borderRadius).input}
                    value={newSite.efficiency}
                    onChangeText={(val) => setNewSite({ ...newSite, efficiency: val })}
                    placeholder="85"
                    keyboardType="numeric"
                    placeholderTextColor={colors.textSecondary}
                />
            </View>
        </View>
    );

    const renderStep3 = () => (
        <View style={styles(colors, spacing, borderRadius).stepContent}>
            <Text style={styles(colors, fontSize).stepTitle}>💰 Financial Details</Text>
            <Text style={styles(colors, fontSize).stepDescription}>Rent and payment terms</Text>

            <View style={styles(colors, spacing).formGroup}>
                <Text style={styles(colors, fontSize).formLabel}>Building Status</Text>
                <TouchableOpacity
                    style={styles(colors, spacing, borderRadius).dropdownButton}
                    onPress={() => setShowBuildingStatusDropdown(true)}
                >
                    <Text style={styles(colors, fontSize).dropdownButtonText}>
                        {beautifyName(newSite.building_status)}
                    </Text>
                    <Text style={styles(colors, fontSize).dropdownButtonIcon}>▼</Text>
                </TouchableOpacity>
            </View>

            <View style={styles(colors, spacing).row}>
                <View style={styles(colors, spacing).halfWidth}>
                    <Text style={styles(colors, fontSize).formLabel}>Monthly Rent (₹)</Text>
                    <TextInput
                        style={styles(colors, spacing, borderRadius).input}
                        value={newSite.rent}
                        onChangeText={(val) => setNewSite({ ...newSite, rent: formatCurrency(val) })}
                        placeholder="5,00,000"
                        keyboardType="numeric"
                        placeholderTextColor={colors.textSecondary}
                    />
                </View>
                <View style={styles(colors, spacing).halfWidth}>
                    <Text style={styles(colors, fontSize).formLabel}>CAM (₹)</Text>
                    <TextInput
                        style={styles(colors, spacing, borderRadius).input}
                        value={newSite.cam}
                        onChangeText={(val) => setNewSite({ ...newSite, cam: formatCurrency(val) })}
                        placeholder="50,000"
                        keyboardType="numeric"
                        placeholderTextColor={colors.textSecondary}
                    />
                </View>
            </View>

            <View style={styles(colors, spacing).row}>
                <View style={styles(colors, spacing).halfWidth}>
                    <Text style={styles(colors, fontSize).formLabel}>CAM Deposit (₹)</Text>
                    <TextInput
                        style={styles(colors, spacing, borderRadius).input}
                        value={newSite.cam_deposit}
                        onChangeText={(val) => setNewSite({ ...newSite, cam_deposit: formatCurrency(val) })}
                        placeholder="1,00,000"
                        keyboardType="numeric"
                        placeholderTextColor={colors.textSecondary}
                    />
                </View>
                <View style={styles(colors, spacing).halfWidth}>
                    <Text style={styles(colors, fontSize).formLabel}>Security Deposit (₹)</Text>
                    <TextInput
                        style={styles(colors, spacing, borderRadius).input}
                        value={newSite.security_deposit}
                        onChangeText={(val) => setNewSite({ ...newSite, security_deposit: formatCurrency(val) })}
                        placeholder="10,00,000"
                        keyboardType="numeric"
                        placeholderTextColor={colors.textSecondary}
                    />
                </View>
            </View>

            <View style={styles(colors, spacing).row}>
                <View style={styles(colors, spacing).halfWidth}>
                    <Text style={styles(colors, fontSize).formLabel}>Lease Term</Text>
                    <TextInput
                        style={styles(colors, spacing, borderRadius).input}
                        value={newSite.lease_term}
                        onChangeText={(val) => setNewSite({ ...newSite, lease_term: val })}
                        placeholder="9 years"
                        placeholderTextColor={colors.textSecondary}
                    />
                </View>
                <View style={styles(colors, spacing).halfWidth}>
                    <Text style={styles(colors, fontSize).formLabel}>Lock-in Period</Text>
                    <TextInput
                        style={styles(colors, spacing, borderRadius).input}
                        value={newSite.lock_in_period}
                        onChangeText={(val) => setNewSite({ ...newSite, lock_in_period: val })}
                        placeholder="3 years"
                        placeholderTextColor={colors.textSecondary}
                    />
                </View>
            </View>

            <View style={styles(colors, spacing).row}>
                <View style={styles(colors, spacing).halfWidth}>
                    <Text style={styles(colors, fontSize).formLabel}>Notice Period</Text>
                    <TextInput
                        style={styles(colors, spacing, borderRadius).input}
                        value={newSite.notice_period}
                        onChangeText={(val) => setNewSite({ ...newSite, notice_period: val })}
                        placeholder="6 months"
                        placeholderTextColor={colors.textSecondary}
                    />
                </View>
                <View style={styles(colors, spacing).halfWidth}>
                    <Text style={styles(colors, fontSize).formLabel}>Rental Escalation (%)</Text>
                    <TextInput
                        style={styles(colors, spacing, borderRadius).input}
                        value={newSite.rental_escalation}
                        onChangeText={(val) => setNewSite({ ...newSite, rental_escalation: val })}
                        placeholder="5"
                        keyboardType="numeric"
                        placeholderTextColor={colors.textSecondary}
                    />
                </View>
            </View>

            <View style={styles(colors, spacing).checkboxContainer}>
                <TouchableOpacity
                    style={styles(colors, spacing).checkbox}
                    onPress={() => setNewSite({ ...newSite, oc: !newSite.oc })}
                >
                    <View style={[styles(colors, spacing, borderRadius).checkboxBox, newSite.oc && styles(colors, spacing, borderRadius).checkboxBoxChecked]}>
                        {newSite.oc && <Text style={styles(colors).checkboxCheck}>✓</Text>}
                    </View>
                    <Text style={styles(colors, fontSize).checkboxLabel}>OC Available</Text>
                </TouchableOpacity>
            </View>

            <View style={styles(colors, spacing).checkboxContainer}>
                <TouchableOpacity
                    style={styles(colors, spacing).checkbox}
                    onPress={() => setNewSite({ ...newSite, will_developer_do_fitouts: !newSite.will_developer_do_fitouts })}
                >
                    <View style={[styles(colors, spacing, borderRadius).checkboxBox, newSite.will_developer_do_fitouts && styles(colors, spacing, borderRadius).checkboxBoxChecked]}>
                        {newSite.will_developer_do_fitouts && <Text style={styles(colors).checkboxCheck}>✓</Text>}
                    </View>
                    <Text style={styles(colors, fontSize).checkboxLabel}>Developer Will Do Fitouts</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderStep4 = () => (
        <View style={styles(colors, spacing, borderRadius).stepContent}>
            <Text style={styles(colors, fontSize).stepTitle}>🚗 Parking & Utilities</Text>
            <Text style={styles(colors, fontSize).stepDescription}>Parking facilities and power details</Text>

            <Text style={styles(colors, fontSize).subSectionTitle}>Car Parking</Text>
            <View style={styles(colors, spacing).formGroup}>
                <Text style={styles(colors, fontSize).formLabel}>Car Parking Ratio</Text>
                <View style={styles(colors, spacing).ratioContainer}>
                    <TextInput
                        style={[styles(colors, spacing, borderRadius).input, styles(colors, spacing, borderRadius).ratioInput]}
                        value={newSite.car_parking_ratio_left}
                        onChangeText={(val) => setNewSite({ ...newSite, car_parking_ratio_left: val })}
                        placeholder="1"
                        keyboardType="numeric"
                        placeholderTextColor={colors.textSecondary}
                    />
                    <Text style={styles(colors, fontSize).ratioSeparator}>:</Text>
                    <TextInput
                        style={[styles(colors, spacing, borderRadius).input, styles(colors, spacing, borderRadius).ratioInput]}
                        value={newSite.car_parking_ratio_right}
                        onChangeText={(val) => setNewSite({ ...newSite, car_parking_ratio_right: val })}
                        placeholder="1000"
                        keyboardType="numeric"
                        placeholderTextColor={colors.textSecondary}
                    />
                </View>
            </View>

            <View style={styles(colors, spacing).row}>
                <View style={styles(colors, spacing).halfWidth}>
                    <Text style={styles(colors, fontSize).formLabel}>Car Slots</Text>
                    <TextInput
                        style={styles(colors, spacing, borderRadius).input}
                        value={newSite.car_parking_slots}
                        onChangeText={(val) => setNewSite({ ...newSite, car_parking_slots: val })}
                        placeholder="11"
                        keyboardType="numeric"
                        placeholderTextColor={colors.textSecondary}
                    />
                </View>
                <View style={styles(colors, spacing).halfWidth}>
                    <Text style={styles(colors, fontSize).formLabel}>Car Charges (₹)</Text>
                    <TextInput
                        style={styles(colors, spacing, borderRadius).input}
                        value={newSite.car_parking_charges}
                        onChangeText={(val) => setNewSite({ ...newSite, car_parking_charges: formatCurrency(val) })}
                        placeholder="5,500"
                        keyboardType="numeric"
                        placeholderTextColor={colors.textSecondary}
                    />
                </View>
            </View>

            <Text style={styles(colors, fontSize).subSectionTitle}>Two-Wheeler Parking</Text>
            <View style={styles(colors, spacing).row}>
                <View style={styles(colors, spacing).halfWidth}>
                    <Text style={styles(colors, fontSize).formLabel}>2-Wheeler Slots</Text>
                    <TextInput
                        style={styles(colors, spacing, borderRadius).input}
                        value={newSite.two_wheeler_slots}
                        onChangeText={(val) => setNewSite({ ...newSite, two_wheeler_slots: val })}
                        placeholder="100"
                        keyboardType="numeric"
                        placeholderTextColor={colors.textSecondary}
                    />
                </View>
                <View style={styles(colors, spacing).halfWidth}>
                    <Text style={styles(colors, fontSize).formLabel}>2-Wheeler Charges (₹)</Text>
                    <TextInput
                        style={styles(colors, spacing, borderRadius).input}
                        value={newSite.two_wheeler_charges}
                        onChangeText={(val) => setNewSite({ ...newSite, two_wheeler_charges: formatCurrency(val) })}
                        placeholder="1,000"
                        keyboardType="numeric"
                        placeholderTextColor={colors.textSecondary}
                    />
                </View>
            </View>

            <Text style={styles(colors, fontSize).subSectionTitle}>Power</Text>
            <View style={styles(colors, spacing).row}>
                <View style={styles(colors, spacing).halfWidth}>
                    <Text style={styles(colors, fontSize).formLabel}>Power</Text>
                    <TextInput
                        style={styles(colors, spacing, borderRadius).input}
                        value={newSite.power}
                        onChangeText={(val) => setNewSite({ ...newSite, power: val })}
                        placeholder="0.8 kva/100 sft"
                        placeholderTextColor={colors.textSecondary}
                    />
                </View>
                <View style={styles(colors, spacing).halfWidth}>
                    <Text style={styles(colors, fontSize).formLabel}>Power Backup</Text>
                    <TextInput
                        style={styles(colors, spacing, borderRadius).input}
                        value={newSite.power_backup}
                        onChangeText={(val) => setNewSite({ ...newSite, power_backup: val })}
                        placeholder="100%"
                        placeholderTextColor={colors.textSecondary}
                    />
                </View>
            </View>
        </View>
    );

    const renderStep5 = () => (
        <View style={styles(colors, spacing, borderRadius).stepContent}>
            <Text style={styles(colors, fontSize).stepTitle}>🏢 Workspace & Amenities</Text>
            <Text style={styles(colors, fontSize).stepDescription}>Office configuration and facilities</Text>

            <View style={styles(colors, spacing).row}>
                <View style={styles(colors, spacing).halfWidth}>
                    <Text style={styles(colors, fontSize).formLabel}>Cabins</Text>
                    <TextInput
                        style={styles(colors, spacing, borderRadius).input}
                        value={newSite.number_of_cabins}
                        onChangeText={(val) => setNewSite({ ...newSite, number_of_cabins: val })}
                        placeholder="20"
                        keyboardType="numeric"
                        placeholderTextColor={colors.textSecondary}
                    />
                </View>
                <View style={styles(colors, spacing).halfWidth}>
                    <Text style={styles(colors, fontSize).formLabel}>Workstations</Text>
                    <TextInput
                        style={styles(colors, spacing, borderRadius).input}
                        value={newSite.number_of_workstations}
                        onChangeText={(val) => setNewSite({ ...newSite, number_of_workstations: val })}
                        placeholder="200"
                        keyboardType="numeric"
                        placeholderTextColor={colors.textSecondary}
                    />
                </View>
            </View>

            <View style={styles(colors, spacing).formGroup}>
                <Text style={styles(colors, fontSize).formLabel}>Workstation Size</Text>
                <TextInput
                    style={styles(colors, spacing, borderRadius).input}
                    value={newSite.size_of_workstation}
                    onChangeText={(val) => setNewSite({ ...newSite, size_of_workstation: val })}
                    placeholder="60 sq ft"
                    placeholderTextColor={colors.textSecondary}
                />
            </View>

            <View style={styles(colors, spacing).row}>
                <View style={styles(colors, spacing).halfWidth}>
                    <Text style={styles(colors, fontSize).formLabel}>Meeting Rooms</Text>
                    <TextInput
                        style={styles(colors, spacing, borderRadius).input}
                        value={newSite.meeting_room}
                        onChangeText={(val) => setNewSite({ ...newSite, meeting_room: val })}
                        placeholder="3"
                        keyboardType="numeric"
                        placeholderTextColor={colors.textSecondary}
                    />
                </View>
                <View style={styles(colors, spacing).halfWidth}>
                    <Text style={styles(colors, fontSize).formLabel}>Discussion Rooms</Text>
                    <TextInput
                        style={styles(colors, spacing, borderRadius).input}
                        value={newSite.discussion_room}
                        onChangeText={(val) => setNewSite({ ...newSite, discussion_room: val })}
                        placeholder="2"
                        keyboardType="numeric"
                        placeholderTextColor={colors.textSecondary}
                    />
                </View>
            </View>

            <View style={styles(colors, spacing).row}>
                <View style={styles(colors, spacing).halfWidth}>
                    <Text style={styles(colors, fontSize).formLabel}>Server Room</Text>
                    <TextInput
                        style={styles(colors, spacing, borderRadius).input}
                        value={newSite.server_room}
                        onChangeText={(val) => setNewSite({ ...newSite, server_room: val })}
                        placeholder="1"
                        keyboardType="numeric"
                        placeholderTextColor={colors.textSecondary}
                    />
                </View>
                <View style={styles(colors, spacing).halfWidth}>
                    <Text style={styles(colors, fontSize).formLabel}>Training Room</Text>
                    <TextInput
                        style={styles(colors, spacing, borderRadius).input}
                        value={newSite.training_room}
                        onChangeText={(val) => setNewSite({ ...newSite, training_room: val })}
                        placeholder="2"
                        keyboardType="numeric"
                        placeholderTextColor={colors.textSecondary}
                    />
                </View>
            </View>

            <View style={styles(colors, spacing).row}>
                <View style={styles(colors, spacing).halfWidth}>
                    <Text style={styles(colors, fontSize).formLabel}>Pantry</Text>
                    <TextInput
                        style={styles(colors, spacing, borderRadius).input}
                        value={newSite.pantry}
                        onChangeText={(val) => setNewSite({ ...newSite, pantry: val })}
                        placeholder="1"
                        keyboardType="numeric"
                        placeholderTextColor={colors.textSecondary}
                    />
                </View>
                <View style={styles(colors, spacing).halfWidth}>
                    <Text style={styles(colors, fontSize).formLabel}>Cafeteria</Text>
                    <TextInput
                        style={styles(colors, spacing, borderRadius).input}
                        value={newSite.cafeteria}
                        onChangeText={(val) => setNewSite({ ...newSite, cafeteria: val })}
                        placeholder="1"
                        keyboardType="numeric"
                        placeholderTextColor={colors.textSecondary}
                    />
                </View>
            </View>

            <View style={styles(colors, spacing).row}>
                <View style={styles(colors, spacing).halfWidth}>
                    <Text style={styles(colors, fontSize).formLabel}>UPS Room</Text>
                    <TextInput
                        style={styles(colors, spacing, borderRadius).input}
                        value={newSite.electrical_ups_room}
                        onChangeText={(val) => setNewSite({ ...newSite, electrical_ups_room: val })}
                        placeholder="1"
                        keyboardType="numeric"
                        placeholderTextColor={colors.textSecondary}
                    />
                </View>
                <View style={styles(colors, spacing).halfWidth}>
                    <Text style={styles(colors, fontSize).formLabel}>Gym</Text>
                    <TextInput
                        style={styles(colors, spacing, borderRadius).input}
                        value={newSite.gym}
                        onChangeText={(val) => setNewSite({ ...newSite, gym: val })}
                        placeholder="1"
                        keyboardType="numeric"
                        placeholderTextColor={colors.textSecondary}
                    />
                </View>
            </View>
        </View>
    );

    const renderStep6 = () => (
        <View style={styles(colors, spacing, borderRadius).stepContent}>
            <Text style={styles(colors, fontSize).stepTitle}>👤 Contact & Photos</Text>
            <Text style={styles(colors, fontSize).stepDescription}>Contact details and property images</Text>

            <Text style={styles(colors, fontSize).subSectionTitle}>Building Owner</Text>
            <View style={styles(colors, spacing).formGroup}>
                <Text style={styles(colors, fontSize).formLabel}>Owner Name</Text>
                <TextInput
                    style={styles(colors, spacing, borderRadius).input}
                    value={newSite.building_owner_name}
                    onChangeText={(val) => setNewSite({ ...newSite, building_owner_name: val })}
                    placeholder="Enter owner name"
                    placeholderTextColor={colors.textSecondary}
                />
            </View>

            <View style={styles(colors, spacing).formGroup}>
                <Text style={styles(colors, fontSize).formLabel}>Owner Contact</Text>
                <TextInput
                    style={styles(colors, spacing, borderRadius).input}
                    value={newSite.building_owner_contact}
                    onChangeText={(val) => setNewSite({ ...newSite, building_owner_contact: val })}
                    placeholder="+91 9876543210"
                    keyboardType="phone-pad"
                    placeholderTextColor={colors.textSecondary}
                />
            </View>

            <Text style={styles(colors, fontSize).subSectionTitle}>Contact Person</Text>
            <View style={styles(colors, spacing).formGroup}>
                <Text style={styles(colors, fontSize).formLabel}>Name</Text>
                <TextInput
                    style={styles(colors, spacing, borderRadius).input}
                    value={newSite.contact_person_name}
                    onChangeText={(val) => setNewSite({ ...newSite, contact_person_name: val })}
                    placeholder="Enter name"
                    placeholderTextColor={colors.textSecondary}
                />
            </View>

            <View style={styles(colors, spacing).row}>
                <View style={styles(colors, spacing).halfWidth}>
                    <Text style={styles(colors, fontSize).formLabel}>Phone</Text>
                    <TextInput
                        style={styles(colors, spacing, borderRadius).input}
                        value={newSite.contact_person_number}
                        onChangeText={(val) => setNewSite({ ...newSite, contact_person_number: val })}
                        placeholder="+91 9876543210"
                        keyboardType="phone-pad"
                        placeholderTextColor={colors.textSecondary}
                    />
                </View>
                <View style={styles(colors, spacing).halfWidth}>
                    <Text style={styles(colors, fontSize).formLabel}>Designation</Text>
                    <TextInput
                        style={styles(colors, spacing, borderRadius).input}
                        value={newSite.contact_person_designation}
                        onChangeText={(val) => setNewSite({ ...newSite, contact_person_designation: val })}
                        placeholder="Manager"
                        placeholderTextColor={colors.textSecondary}
                    />
                </View>
            </View>

            <View style={styles(colors, spacing).formGroup}>
                <Text style={styles(colors, fontSize).formLabel}>Email</Text>
                <TextInput
                    style={styles(colors, spacing, borderRadius).input}
                    value={newSite.contact_person_email}
                    onChangeText={(val) => setNewSite({ ...newSite, contact_person_email: val })}
                    placeholder="contact@example.com"
                    keyboardType="email-address"
                    placeholderTextColor={colors.textSecondary}
                />
            </View>

            <View style={styles(colors, spacing).formGroup}>
                <Text style={styles(colors, fontSize).formLabel}>Additional Notes</Text>
                <TextInput
                    style={[styles(colors, spacing, borderRadius).input, styles(colors, spacing, borderRadius).textArea]}
                    value={newSite.remarks}
                    onChangeText={(val) => setNewSite({ ...newSite, remarks: val })}
                    placeholder="Any additional observations..."
                    placeholderTextColor={colors.textSecondary}
                    multiline
                />
            </View>

            <Text style={styles(colors, fontSize).subSectionTitle}>Property Photos</Text>
            <TouchableOpacity
                style={styles(colors, spacing, borderRadius, shadows).addPhotoButton}
                onPress={handleAddPhoto}
            >
                <Text style={styles(colors, fontSize).addPhotoButtonText}>📤 Upload Photo</Text>
            </TouchableOpacity>

            {buildingPhotos.length > 0 && (
                <View style={styles(colors, spacing).photoPreviewContainer}>
                    <Text style={styles(colors, fontSize).photoCountText}>
                        {buildingPhotos.length} photo(s) uploaded
                    </Text>
                    <View style={styles(colors, spacing).photoGrid}>
                        {buildingPhotos.map((photo, idx) => (
                            <View key={photo.id} style={styles(colors, spacing, borderRadius).photoGridItem}>
                                <Image
                                    source={{ uri: photo.uri }}
                                    style={styles(colors).photoGridImage}
                                />
                                <TouchableOpacity
                                    style={styles(colors, spacing, borderRadius).photoRemoveButton}
                                    onPress={() => setBuildingPhotos(buildingPhotos.filter(p => p.id !== photo.id))}
                                >
                                    <Text style={styles(colors, fontSize).photoRemoveButtonText}>×</Text>
                                </TouchableOpacity>
                                <View style={styles(colors, spacing, borderRadius).photoIndexBadge}>
                                    <Text style={styles(colors, fontSize).photoIndexText}>{idx + 1}</Text>
                                </View>
                            </View>
                        ))}
                    </View>
                </View>
            )}
        </View>
    );

    const DropdownModal = ({ visible, options, onSelect, onClose, title }: any) => (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <TouchableOpacity
                style={styles(colors).dropdownOverlay}
                activeOpacity={1}
                onPress={onClose}
            >
                <View style={styles(colors, spacing, borderRadius, shadows).dropdownContainer}>
                    <Text style={styles(colors, fontSize).dropdownTitle}>{title}</Text>
                    <ScrollView style={styles(colors).dropdownScroll}>
                        {options.map((option: any) => (
                            <TouchableOpacity
                                key={option.value}
                                style={styles(colors, spacing, borderRadius).dropdownOption}
                                onPress={() => {
                                    onSelect(option.value);
                                    onClose();
                                }}
                            >
                                <Text style={styles(colors, fontSize).dropdownOptionText}>{option.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            </TouchableOpacity>
        </Modal>
    );

    const ImageSourceModal = () => (
        <Modal visible={showImageSourceModal} transparent animationType="fade" onRequestClose={() => setShowImageSourceModal(false)}>
            <TouchableOpacity
                style={styles(colors).dropdownOverlay}
                activeOpacity={1}
                onPress={() => setShowImageSourceModal(false)}
            >
                <View style={styles(colors, spacing, borderRadius, shadows).imageSourceContainer}>
                    <Text style={styles(colors, fontSize).dropdownTitle}>Select Image Source</Text>
                    
                    <TouchableOpacity
                        style={styles(colors, spacing, borderRadius, shadows).imageSourceOption}
                        onPress={pickImageFromCamera}
                    >
                        <Text style={styles(colors, fontSize).imageSourceIcon}>📷</Text>
                        <Text style={styles(colors, fontSize).imageSourceText}>Take Photo</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles(colors, spacing, borderRadius, shadows).imageSourceOption}
                        onPress={pickImageFromGallery}
                    >
                        <Text style={styles(colors, fontSize).imageSourceIcon}>🖼️</Text>
                        <Text style={styles(colors, fontSize).imageSourceText}>Choose from Gallery</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles(colors, spacing, borderRadius).cancelButton}
                        onPress={() => setShowImageSourceModal(false)}
                    >
                        <Text style={styles(colors, fontSize).cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        </Modal>
    );

    return (
        <SafeAreaView style={styles(colors).container} edges={['top', 'bottom']}>
            <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
            
            <View style={styles(colors, spacing).header}>
                <TouchableOpacity style={styles(colors, spacing).backButton} onPress={onBack}>
                    <BackIcon />
                </TouchableOpacity>
                <Text style={styles(colors, fontSize).headerTitle}>Create New Site</Text>
                <View style={styles(colors).headerSpacer} />
            </View>

            <View style={styles(colors, spacing, borderRadius).contentContainer}>
                {renderStepIndicator()}

                <ScrollView style={styles(colors).scrollView} showsVerticalScrollIndicator={false}>
                    <View style={styles(colors, spacing).formContainer}>
                        {currentStep === 1 && renderStep1()}
                        {currentStep === 2 && renderStep2()}
                        {currentStep === 3 && renderStep3()}
                        {currentStep === 4 && renderStep4()}
                        {currentStep === 5 && renderStep5()}
                        {currentStep === 6 && renderStep6()}
                    </View>
                </ScrollView>

                <View style={styles(colors, spacing, borderRadius).navigationButtons}>
                    {currentStep > 1 && (
                        <TouchableOpacity
                            style={styles(colors, spacing, borderRadius).navButton}
                            onPress={handlePrevStep}
                        >
                            <Text style={styles(colors, fontSize).navButtonText}>← Previous</Text>
                        </TouchableOpacity>
                    )}
                    {currentStep < 6 ? (
                        <TouchableOpacity
                            style={[styles(colors, spacing, borderRadius).navButton, styles(colors, spacing, borderRadius).navButtonPrimary, currentStep === 1 && styles(colors, spacing, borderRadius).navButtonFull]}
                            onPress={handleNextStep}
                        >
                            <Text style={styles(colors, fontSize).navButtonTextPrimary}>Next →</Text>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity
                            style={[styles(colors, spacing, borderRadius).navButton, styles(colors, spacing, borderRadius).navButtonPrimary, styles(colors, spacing, borderRadius).navButtonFull, creatingSite && styles(colors, spacing, borderRadius).buttonDisabled]}
                            onPress={handleCreateSite}
                            disabled={creatingSite}
                        >
                            {creatingSite ? (
                                <View style={styles(colors, spacing).buttonLoading}>
                                    <ActivityIndicator color={colors.white} size="small" />
                                    <Text style={[styles(colors, fontSize).navButtonTextPrimary, { marginLeft: spacing.sm }]}>
                                        Creating...
                                    </Text>
                                </View>
                            ) : (
                                <Text style={styles(colors, fontSize).navButtonTextPrimary}>✓ Create Site</Text>
                            )}
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            <DropdownModal
                visible={showBuildingStatusDropdown}
                options={BUILDING_STATUS_OPTIONS}
                onSelect={(value: string) => setNewSite({ ...newSite, building_status: value })}
                onClose={() => setShowBuildingStatusDropdown(false)}
                title="Select Building Status"
            />

            <DropdownModal
                visible={showFloorConditionDropdown}
                options={FLOOR_CONDITION_OPTIONS}
                onSelect={(value: string) => setNewSite({ ...newSite, floor_condition: value })}
                onClose={() => setShowFloorConditionDropdown(false)}
                title="Select Floor Condition"
            />

            <ImageSourceModal />
        </SafeAreaView>
    );
};

const styles = (colors: any, spacing?: any, borderRadius?: any, shadows?: any) =>
    StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: colors.primary,
        },
        header: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: spacing?.lg || 16,
            paddingVertical: spacing?.sm || 8,
            backgroundColor: colors.primary,
            marginBottom: spacing?.sm || 8,
        },
        headerSpacer: {
            width: 32,
        },
        backButton: {
            padding: spacing?.xs || 4,
        },
        backIcon: {
            width: 24,
            height: 24,
            alignItems: 'center',
            justifyContent: 'center',
        },
        backArrow: {
            width: 12,
            height: 12,
            borderLeftWidth: 2,
            borderTopWidth: 2,
            borderColor: colors.white,
            transform: [{ rotate: '-45deg' }],
        },
        headerTitle: {
            fontSize: 18,
            fontWeight: '700',
            color: colors.white,
            flex: 1,
            textAlign: 'center',
        },
        scrollView: {
            flex: 1,
            backgroundColor: colors.backgroundSecondary,
        },
        contentContainer: {
            flex: 1,
            backgroundColor: colors.backgroundSecondary,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            marginTop: 0,
        },
        stepIndicator: {
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            paddingVertical: spacing?.lg || 16,
            paddingHorizontal: spacing?.md || 12,
        },
        stepIndicatorItem: {
            flexDirection: 'row',
            alignItems: 'center',
        },
        stepCircle: {
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: colors.border,
            justifyContent: 'center',
            alignItems: 'center',
        },
        stepCircleActive: {
            backgroundColor: colors.primary,
        },
        stepNumber: {
            fontSize: 12,
            fontWeight: '700',
            color: colors.textSecondary,
        },
        stepNumberActive: {
            color: colors.white,
        },
        stepLine: {
            width: 20,
            height: 2,
            backgroundColor: colors.border,
        },
        stepLineActive: {
            backgroundColor: colors.primary,
        },
        stepContent: {
            flex: 1,
        },
        stepTitle: {
            fontSize: 20,
            fontWeight: '700',
            color: colors.text,
            marginBottom: spacing?.xs || 4,
        },
        stepDescription: {
            fontSize: 14,
            color: colors.textSecondary,
            marginBottom: spacing?.lg || 16,
        },
        subSectionTitle: {
            fontSize: 16,
            fontWeight: '700',
            color: colors.text,
            marginTop: spacing?.lg || 16,
            marginBottom: spacing?.md || 12,
        },
        formContainer: {
            padding: spacing?.lg || 16,
        },
        formGroup: {
            marginBottom: spacing?.md || 12,
        },
        formLabel: {
            fontSize: 12,
            fontWeight: '600',
            color: colors.text,
            marginBottom: spacing?.xs || 4,
        },
        input: {
            paddingHorizontal: spacing?.md || 12,
            paddingVertical: spacing?.md || 12,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: borderRadius?.md || 8,
            backgroundColor: colors.white,
            fontSize: 14,
            color: colors.text,
        },
        textArea: {
            minHeight: 100,
            textAlignVertical: 'top',
        },
        row: {
            flexDirection: 'row',
            gap: spacing?.md || 12,
            marginBottom: spacing?.md || 12,
        },
        halfWidth: {
            flex: 1,
        },
        dropdownButton: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: spacing?.md || 12,
            paddingVertical: spacing?.md || 12,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: borderRadius?.md || 8,
            backgroundColor: colors.white,
        },
        dropdownButtonText: {
            fontSize: 14,
            color: colors.text,
        },
        dropdownButtonIcon: {
            fontSize: 10,
            color: colors.textSecondary,
        },
        dropdownOverlay: {
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: spacing?.lg || 16,
        },
        dropdownContainer: {
            width: '100%',
            maxWidth: 400,
            maxHeight: 400,
            backgroundColor: colors.white,
            borderRadius: borderRadius?.xl || 16,
            padding: spacing?.lg || 16,
            ...shadows?.lg,
        },
        dropdownTitle: {
            fontSize: 16,
            fontWeight: '700',
            color: colors.text,
            marginBottom: spacing?.md || 12,
        },
        dropdownScroll: {
            maxHeight: 300,
        },
        dropdownOption: {
            paddingVertical: spacing?.md || 12,
            paddingHorizontal: spacing?.md || 12,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
        },
        dropdownOptionText: {
            fontSize: 14,
            color: colors.text,
        },
        imageSourceContainer: {
            width: '100%',
            maxWidth: 400,
            backgroundColor: colors.white,
            borderRadius: borderRadius?.xl || 16,
            padding: spacing?.lg || 16,
            ...shadows?.lg,
        },
        imageSourceOption: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: spacing?.lg || 16,
            paddingHorizontal: spacing?.md || 12,
            borderRadius: borderRadius?.md || 8,
            backgroundColor: colors.backgroundSecondary,
            marginBottom: spacing?.md || 12,
            ...shadows?.sm,
        },
        imageSourceIcon: {
            fontSize: 28,
            marginRight: spacing?.md || 12,
        },
        imageSourceText: {
            fontSize: 16,
            fontWeight: '600',
            color: colors.text,
        },
        cancelButton: {
            paddingVertical: spacing?.md || 12,
            alignItems: 'center',
            marginTop: spacing?.sm || 8,
        },
        cancelButtonText: {
            fontSize: 14,
            color: colors.textSecondary,
            fontWeight: '600',
        },
        checkboxContainer: {
            marginBottom: spacing?.md || 12,
        },
        checkbox: {
            flexDirection: 'row',
            alignItems: 'center',
        },
        checkboxBox: {
            width: 24,
            height: 24,
            borderWidth: 2,
            borderColor: colors.border,
            borderRadius: borderRadius?.sm || 4,
            marginRight: spacing?.sm || 8,
            justifyContent: 'center',
            alignItems: 'center',
        },
        checkboxBoxChecked: {
            backgroundColor: colors.primary,
            borderColor: colors.primary,
        },
        checkboxCheck: {
            color: colors.white,
            fontSize: 14,
            fontWeight: '700',
        },
        checkboxLabel: {
            fontSize: 14,
            color: colors.text,
            flex: 1,
        },
        ratioContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing?.sm || 8,
        },
        ratioInput: {
            flex: 1,
            marginBottom: 0,
        },
        ratioSeparator: {
            fontSize: 18,
            fontWeight: '700',
            color: colors.text,
        },
        addPhotoButton: {
            backgroundColor: colors.primary,
            paddingVertical: spacing?.md || 12,
            paddingHorizontal: spacing?.lg || 16,
            borderRadius: borderRadius?.md || 8,
            alignItems: 'center',
            marginBottom: spacing?.md || 12,
            flexDirection: 'row',
            justifyContent: 'center',
            gap: spacing?.sm || 8,
            ...shadows?.md,
        },
        addPhotoButtonText: {
            color: colors.white,
            fontSize: 14,
            fontWeight: '700',
        },
        photoPreviewContainer: {
            marginTop: spacing?.sm || 8,
        },
        photoCountText: {
            fontSize: 12,
            color: colors.primary,
            fontWeight: '600',
            marginBottom: spacing?.md || 12,
            textAlign: 'center',
        },
        photoGrid: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: spacing?.md || 12,
        },
        photoGridItem: {
            width: (screenWidth - spacing?.lg * 2 - spacing?.lg * 2 - spacing?.md) / 2 || 150,
            height: 120,
            borderRadius: borderRadius?.md || 8,
            overflow: 'hidden',
            position: 'relative',
            ...shadows?.sm,
        },
        photoGridImage: {
            width: '100%',
            height: '100%',
            backgroundColor: colors.backgroundSecondary,
        },
        photoRemoveButton: {
            position: 'absolute',
            top: spacing?.xs || 4,
            right: spacing?.xs || 4,
            width: 24,
            height: 24,
            borderRadius: 12,
            backgroundColor: colors.error,
            justifyContent: 'center',
            alignItems: 'center',
        },
        photoRemoveButtonText: {
            color: colors.white,
            fontSize: 18,
            fontWeight: '700',
            lineHeight: 20,
        },
        photoIndexBadge: {
            position: 'absolute',
            bottom: spacing?.xs || 4,
            left: spacing?.xs || 4,
            backgroundColor: colors.primary,
            paddingHorizontal: spacing?.sm || 8,
            paddingVertical: spacing?.xs || 4,
            borderRadius: borderRadius?.sm || 4,
        },
        photoIndexText: {
            color: colors.white,
            fontSize: 10,
            fontWeight: '700',
        },
        navigationButtons: {
            flexDirection: 'row',
            gap: spacing?.md || 12,
            padding: spacing?.lg || 16,
            backgroundColor: colors.white,
            borderTopWidth: 1,
            borderTopColor: colors.border,
        },
        navButton: {
            flex: 1,
            paddingVertical: spacing?.md || 12,
            paddingHorizontal: spacing?.lg || 16,
            borderRadius: borderRadius?.lg || 12,
            alignItems: 'center',
            borderWidth: 2,
            borderColor: colors.primary,
        },
        navButtonPrimary: {
            backgroundColor: colors.primary,
        },
        navButtonFull: {
            flex: 1,
        },
        navButtonText: {
            fontSize: 14,
            fontWeight: '700',
            color: colors.primary,
        },
        navButtonTextPrimary: {
            fontSize: 14,
            fontWeight: '700',
            color: colors.white,
        },
        buttonDisabled: {
            opacity: 0.6,
        },
        buttonLoading: {
            flexDirection: 'row',
            alignItems: 'center',
        },
    });

export default CreateSite;