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
    Linking,
    Modal,
    Animated
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import CreateCar from './createCar';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImageManipulator from 'expo-image-manipulator';

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
    VehicleAssignment
} from './types';
import { BACKEND_URL } from '../../config/config';
import { formatDate, getStatusColor, getStatusIcon, getStatusIconBooking } from './utils';
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
    pollution_expiry_date: string;
    insurance_expiry_date: string;
    registration_expiry_date: string;
}

interface CarBooking {
    id: number;
    booked_by: {
        full_name: string;
        email: string;
    };
    booked_for: {
        full_name: string;
        email: string;
    } | null;
    start_time: string;
    end_time: string;
    start_location: string;
    end_location: string;
    purpose: string | null;
    status: string;
    created_at: string;
    vehicle_assignments: VehicleAssignment[];
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
    const [pollutionDatePickerOpen, setPollutionDatePickerOpen] = useState(false);
    const [insuranceDatePickerOpen, setInsuranceDatePickerOpen] = useState(false);
    const [registrationDatePickerOpen, setRegistrationDatePickerOpen] = useState(false);
    const [showMonthPicker, setShowMonthPicker] = useState(false);
    const [showYearPicker, setShowYearPicker] = useState(false);
    const [tempMonth, setTempMonth] = useState('');
    const [tempYear, setTempYear] = useState('');
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
        pollution_expiry_date: '',
        insurance_expiry_date: '',
        registration_expiry_date: '',
    });
    const [isDownloadReportModalVisible, setIsDownloadReportModalVisible] = useState(false);
    const [selectedMonth, setSelectedMonth] = useState('');
    const [selectedYear, setSelectedYear] = useState('');
    const [isDownloading, setIsDownloading] = useState(false);

    // Car Bookings Modal State
    const [isCarBookingsModalVisible, setIsCarBookingsModalVisible] = useState(false);
    const [carBookings, setCarBookings] = useState<CarBooking[]>([]);
    const [loadingCarBookings, setLoadingCarBookings] = useState(false);

    // Driver assignment state
    const [selectedAssignment, setSelectedAssignment] = useState<VehicleAssignment | null>(null);
    const [isDriverModalVisible, setIsDriverModalVisible] = useState(false);
    const [availableDrivers, setAvailableDrivers] = useState<any[]>([]);
    const [selectedDriverId, setSelectedDriverId] = useState<string>('');
    const [loadingDrivers, setLoadingDrivers] = useState(false);
    const [updatingBooking, setUpdatingBooking] = useState(false);

    // Odometer modal state
    const [odometerModal, setOdometerModal] = useState({
        visible: false,
        type: 'start' as 'start' | 'end',
        bookingId: null as number | null,
        selectedStatus: '',
        cancellationReason: undefined as string | undefined,
        assignments: [] as VehicleAssignment[],
    });
    const [odometerReadings, setOdometerReadings] = useState<{ [key: number]: string }>({});
    const [submittingOdometer, setSubmittingOdometer] = useState(false);

    useEffect(() => {
        if (token) {
            fetchVehicles();
        }
    }, [token, city]);

    const fetchVehicles = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${BACKEND_URL}/manager/getCars`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ token, city }),
            });

            const text = await response.text();

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
                Alert.alert('Error', 'Server returned an unexpected response');
            }
        } catch (error) {
            console.error('Error fetching vehicles:', error);
            Alert.alert('Network Error', 'Unable to connect to server. Please check your internet connection.');
        } finally {
            setLoading(false);
        }
    };

    const fetchCarBookings = async (vehicleId: number) => {
        setLoadingCarBookings(true);
        try {
            const response = await fetch(`${BACKEND_URL}/manager/getParticularCarBooking`, {
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
                        console.log('Car bookings data:', data);
                        console.log('Bookings array:', data.bookings);
                        console.log('Bookings length:', data.bookings?.length);

                        const bookingsData = data.bookings || data || [];
                        console.log('Final bookings data:', bookingsData);

                        setCarBookings(Array.isArray(bookingsData) ? bookingsData : [bookingsData]);
                        setIsCarBookingsModalVisible(true);
                    } else {
                        Alert.alert('Error', data.message || 'Failed to fetch bookings');
                    }
                } catch (parseError) {
                    console.error('Failed to parse car bookings:', parseError);
                    Alert.alert('Error', 'Invalid response from server');
                }
            } else {
                Alert.alert('Error', 'Invalid response from server');
            }
        } catch (error) {
            console.error('Error fetching car bookings:', error);
            Alert.alert('Error', 'Network error occurred');
        } finally {
            setLoadingCarBookings(false);
        }
    };

    const fetchAvailableDrivers = async () => {
        setLoadingDrivers(true);
        try {
            const response = await fetch(`${BACKEND_URL}/manager/getDrivers`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ token }),
            });

            const text = await response.text();
            if (text.trim().startsWith('{')) {
                try {
                    const data = JSON.parse(text);
                    if (response.ok && data.drivers) {
                        setAvailableDrivers(data.drivers);
                    } else {
                        Alert.alert('Error', data.message || 'Failed to fetch drivers');
                    }
                } catch (parseError) {
                    console.error('Failed to parse drivers response:', parseError);
                    Alert.alert('Error', 'Invalid response from server');
                }
            } else {
                Alert.alert('Error', 'Invalid response from server');
            }
        } catch (error) {
            console.error('Error fetching drivers:', error);
            Alert.alert('Error', 'Network error occurred');
        } finally {
            setLoadingDrivers(false);
        }
    };

    const updateDriverAssignment = async () => {
        if (!selectedAssignment || !selectedDriverId) {
            Alert.alert('Error', 'Please select a driver');
            return;
        }

        try {
            const response = await fetch(`${BACKEND_URL}/manager/updateDriverInBooking`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    token,
                    assignment_id: selectedAssignment.id,
                    driver_id: selectedDriverId,
                }),
            });

            const text = await response.text();
            if (text.trim().startsWith('{')) {
                try {
                    const data = JSON.parse(text);
                    if (response.ok) {
                        Alert.alert('Success', 'Driver updated successfully!');
                        setIsDriverModalVisible(false);
                        setSelectedAssignment(null);
                        setSelectedDriverId('');
                        // Refresh the bookings
                        if (selectedVehicle) {
                            fetchCarBookings(selectedVehicle.id);
                        }
                    } else {
                        Alert.alert('Error', data.message || 'Failed to update driver');
                    }
                } catch (parseError) {
                    console.error('Failed to parse update driver response:', parseError);
                    Alert.alert('Error', 'Invalid response from server');
                }
            } else {
                Alert.alert('Error', 'Invalid response from server');
            }
        } catch (error) {
            console.error('Error updating driver:', error);
            Alert.alert('Error', 'Network error occurred');
        }
    };

    const handleOpenDriverModal = async (assignment: VehicleAssignment) => {
        setSelectedAssignment(assignment);
        setSelectedDriverId(assignment.assigned_driver?.employee_id || '');
        await fetchAvailableDrivers();
        setIsDriverModalVisible(true);
    };

    const updateBookingStatus = async (bookingId: number, status: string, reason?: string) => {
        console.log('=== updateBookingStatus START ===');
        console.log('Booking ID:', bookingId);
        console.log('Status:', status);

        if (status === 'in-progress' || status === 'completed') {
            const booking = carBookings.find(b => b.id === bookingId);

            if (!booking) {
                Alert.alert('Error', 'Booking not found');
                return;
            }

            const assignments = booking.vehicle_assignments || [];

            console.log('Assignments found:', assignments.length);

            if (assignments.length === 0) {
                Alert.alert('No Vehicles Assigned', 'This booking has no vehicles assigned.');
                return;
            }

            // Clear readings first
            setOdometerReadings({});

            // Set modal state
            setOdometerModal({
                visible: true,
                type: status === 'in-progress' ? 'start' : 'end',
                bookingId: bookingId,
                selectedStatus: status,
                cancellationReason: reason || '',
                assignments: assignments,
            });

            return;
        }

        await performStatusUpdate(bookingId, status, reason);
    };

    const performStatusUpdate = async (bookingId: number, status: string, reason?: string, readings?: { [key: number]: string }) => {
        setUpdatingBooking(true);
        setSubmittingOdometer(true);
        try {
            const requestBody: any = {
                token,
                booking_id: bookingId,
                status: status,
            };
            if (status === 'cancelled' && reason) {
                requestBody.reason_of_cancellation = reason;
            }
            if (status === 'in-progress' && readings) {
                requestBody.odometer_readings = Object.entries(readings).map(([assignmentId, reading]) => ({
                    assignment_id: parseInt(assignmentId),
                    odometer_start_reading: reading
                }));
            }
            if (status === 'completed' && readings) {
                requestBody.odometer_readings = Object.entries(readings).map(([assignmentId, reading]) => ({
                    assignment_id: parseInt(assignmentId),
                    odometer_end_reading: reading
                }));
            }

            const response = await fetch(`${BACKEND_URL}/manager/updateCarBookings`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(requestBody),
            });

            const text = await response.text();
            if (text.trim().startsWith('{')) {
                try {
                    const data = JSON.parse(text);
                    if (response.ok) {
                        Alert.alert('Success', 'Booking status updated successfully!');
                        // Refresh bookings
                        if (selectedVehicle) {
                            fetchCarBookings(selectedVehicle.id);
                        }
                    } else {
                        Alert.alert('Error', data.message || 'Failed to update booking status');
                    }
                } catch (parseError) {
                    console.error('Failed to parse update booking response:', parseError);
                    Alert.alert('Error', 'Invalid response from server');
                }
            } else {
                Alert.alert('Error', 'Invalid response from server');
            }
        } catch (error) {
            console.error('Error updating booking status:', error);
            Alert.alert('Error', 'Network error occurred');
        } finally {
            setUpdatingBooking(false);
            setSubmittingOdometer(false);
            setOdometerModal({
                visible: false,
                type: 'start',
                bookingId: null,
                selectedStatus: '',
                cancellationReason: undefined,
                assignments: [],
            });
            setOdometerReadings({});
        }
    };

    const handleOdometerConfirm = async () => {
        // Check if all assignments have readings
        const missingReadings = odometerModal.assignments.filter(
            assignment => !odometerReadings[assignment.id]?.trim()
        );

        if (missingReadings.length > 0) {
            Alert.alert('Error', `Please enter odometer readings for all ${odometerModal.assignments.length} vehicle(s)`);
            return;
        }

        // Validate that readings are numeric
        const invalidReadings = Object.entries(odometerReadings).filter(
            ([_, value]) => isNaN(Number(value)) || Number(value) <= 0
        );

        if (invalidReadings.length > 0) {
            Alert.alert('Error', 'Please enter valid numeric odometer readings greater than 0');
            return;
        }

        if (odometerModal.bookingId) {
            await performStatusUpdate(
                odometerModal.bookingId,
                odometerModal.selectedStatus,
                odometerModal.cancellationReason,
                odometerReadings
            );
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
        setDeletedPhotoIds([]);
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
            pollution_expiry_date: vehicle.pollution_certificate_expiry_date || '',
            insurance_expiry_date: vehicle.insurance_certificate_expiry_date || '',
            registration_expiry_date: vehicle.registration_certificate_expiry_date || '',
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
        allowsEditing: true, // ✅ ENABLES INTERACTIVE CROP/ZOOM
        aspect: [16, 9], // ✅ SETS CROP BOX TO 16:9 RATIO
        quality: 0.8, // Good quality with reasonable file size
    });

    if (!result.canceled && result.assets[0]) {
        const newPhotos = [...updateVehicleForm.photos];

        if (index < newPhotos.length) {
            newPhotos[index] = {
                id: newPhotos[index].id,
                photo: result.assets[0].uri,
                uri: result.assets[0].uri,
                isNew: true,
            };
        } else {
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

                        if (!photoToRemove.isNew && photoToRemove.id) {
                            setDeletedPhotoIds(prev => [...prev, photoToRemove.id]);
                        }

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

        let expiryDateField: keyof UpdateVehicleForm;
        let datePickerOpen: boolean;
        let setDatePickerOpen: (open: boolean) => void;

        if (type === 'pollution_certificate') {
            expiryDateField = 'pollution_expiry_date';
            datePickerOpen = pollutionDatePickerOpen;
            setDatePickerOpen = setPollutionDatePickerOpen;
        } else if (type === 'insurance_document') {
            expiryDateField = 'insurance_expiry_date';
            datePickerOpen = insuranceDatePickerOpen;
            setDatePickerOpen = setInsuranceDatePickerOpen;
        } else {
            expiryDateField = 'registration_expiry_date';
            datePickerOpen = registrationDatePickerOpen;
            setDatePickerOpen = setRegistrationDatePickerOpen;
        }

        let displayName = '';
        let statusText = '';
        if (newDocument) {
            displayName = (newDocument as any).name;
            statusText = '✓ New document selected';
        } else if (existingDocument) {
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

                <View style={styles.expiryDateContainer}>
                    <Text style={[styles.expiryLabel, { marginTop: 8 }]}>Expiry Date</Text>
                    <TouchableOpacity
                        style={styles.datePickerButton}
                        onPress={() => setDatePickerOpen(true)}
                    >
                        <MaterialIcons name="calendar-today" size={20} color="#008069" />
                        <Text style={styles.datePickerText}>
                            {updateVehicleForm[expiryDateField]
                                ? new Date(updateVehicleForm[expiryDateField] as string).toLocaleDateString('en-GB')
                                : 'Select Expiry Date'}
                        </Text>
                    </TouchableOpacity>
                </View>

                {datePickerOpen && (
                    <DateTimePicker
                        value={updateVehicleForm[expiryDateField]
                            ? new Date(updateVehicleForm[expiryDateField] as string)
                            : new Date()}
                        mode="date"
                        display="default"
                        onChange={(event, selectedDate) => {
                            setDatePickerOpen(false);
                            if (selectedDate) {
                                setUpdateVehicleForm({
                                    ...updateVehicleForm,
                                    [expiryDateField]: selectedDate.toISOString()
                                });
                            }
                        }}
                        minimumDate={new Date()}
                    />
                )}
            </View>
        );
    };

    const pickDocument = async (type: 'pollution_certificate' | 'rc_document' | 'insurance_document') => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['application/pdf', 'image/*'],
                copyToCacheDirectory: true,
            });

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

            updateVehicleForm.photos.forEach((photo, index) => {
                if (photo.isNew && photo.uri) {
                    formData.append('photos', {
                        uri: photo.uri,
                        type: 'image/jpeg',
                        name: `vehicle_photo_${index}.jpg`,
                    } as any);
                }
            });

            if (deletedPhotoIds.length > 0) {
                formData.append('delete_photo_ids', deletedPhotoIds.join(','));
            }

            if (updateVehicleForm.pollution_certificate) {
                formData.append('pollution_certificate', updateVehicleForm.pollution_certificate as any);
            }
            if (updateVehicleForm.pollution_expiry_date) {
                formData.append('pollution_expiry_date', updateVehicleForm.pollution_expiry_date);
            }

            if (updateVehicleForm.rc_document) {
                formData.append('rc_document', updateVehicleForm.rc_document as any);
            }
            if (updateVehicleForm.registration_expiry_date) {
                formData.append('registration_expiry_date', updateVehicleForm.registration_expiry_date);
            }

            if (updateVehicleForm.insurance_document) {
                formData.append('insurance_document', updateVehicleForm.insurance_document as any);
            }
            if (updateVehicleForm.insurance_expiry_date) {
                formData.append('insurance_expiry_date', updateVehicleForm.insurance_expiry_date);
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
                    setDeletedPhotoIds([]);
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

    const generateMonthYearOptions = () => {
        const months = [
            { label: 'January', value: '01' },
            { label: 'February', value: '02' },
            { label: 'March', value: '03' },
            { label: 'April', value: '04' },
            { label: 'May', value: '05' },
            { label: 'June', value: '06' },
            { label: 'July', value: '07' },
            { label: 'August', value: '08' },
            { label: 'September', value: '09' },
            { label: 'October', value: '10' },
            { label: 'November', value: '11' },
            { label: 'December', value: '12' },
        ];

        const currentYear = new Date().getFullYear();
        const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

        return { months, years };
    };

    const handleDownloadReport = async () => {
        if (!selectedMonth || !selectedYear || !selectedVehicle) {
            Alert.alert('Error', 'Please select both month and year');
            return;
        }

        setIsDownloading(true);
        try {
            const month = `${selectedMonth}/${selectedYear}`;
            const response = await fetch(`${BACKEND_URL}/manager/downloadVehicleReport`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    token,
                    vehicle_id: selectedVehicle.id,
                    month: month,
                }),
            });

            const text = await response.text();

            if (text.trim().startsWith('{')) {
                const data = JSON.parse(text);

                if (response.ok && data.success) {
                    setIsDownloadReportModalVisible(false);

                    Linking.openURL(data.file_url).catch(err => {
                        Alert.alert('Error', 'Unable to open report');
                        console.error('Error opening URL:', err);
                    });

                    setSelectedMonth('');
                    setSelectedYear('');
                } else {
                    Alert.alert('Error', data.message || 'Failed to download report');
                }
            } else {
                Alert.alert('Error', 'Invalid response from server');
            }
        } catch (error) {
            console.error('Error downloading report:', error);
            Alert.alert('Error', 'Network error occurred');
        } finally {
            setIsDownloading(false);
        }
    };

    const getDisplayStatus = (vehicle: Vehicle): string => {
        if (vehicle.booked_for) {
            return 'booked';
        }
        return vehicle.status;
    };

    const getStatusDisplayText = (vehicle: Vehicle): string => {
        if (vehicle.booked_for) {
            return `BOOKED - ${vehicle.booked_for}`;
        }
        return vehicle.status.replace('_', ' ').toUpperCase();
    };

    // Booking Card Component (same as in Bookings.tsx)
    const BookingCardComponent: React.FC<{
        booking: CarBooking;
        index: number;
        onUpdateStatus: (bookingId: number, status: string, reason?: string) => void;
        onOpenDriverModal: (assignment: VehicleAssignment) => void;
        updating: boolean;
    }> = ({ booking, index, onUpdateStatus, onOpenDriverModal, updating }) => {
        const slideAnim = useRef(new Animated.Value(30)).current;
        const [selectedStatus, setSelectedStatus] = useState(booking.status);
        const [showCancellationInput, setShowCancellationInput] = useState(false);
        const [cancellationReason, setCancellationReason] = useState('');
        const [isUpdating, setIsUpdating] = useState(false);

        useEffect(() => {
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 400,
                delay: index * 100,
                useNativeDriver: true,
            }).start();
        }, []);

        const handleStatusChange = (status: string) => {
            // Never allow updating to 'Assigned' status manually
            if (status === 'assigned' && booking.status !== 'assigned') {
                Alert.alert('Invalid Action', 'Cannot manually set status to Assigned');
                return;
            }

            // Normalize current status to lowercase for comparison
            const currentStatus = booking.status.toLowerCase();
            const newStatus = status.toLowerCase();

            // From assigned: only allow in-progress or cancelled
            if (currentStatus === 'assigned') {
                if (newStatus !== 'in-progress' && newStatus !== 'cancelled') {
                    Alert.alert('Invalid Action', 'From Assigned, you can only move to In-Progress or Cancelled');
                    return;
                }
            }

            // From in-progress: only allow completed or cancelled
            if (currentStatus === 'in-progress') {
                if (newStatus !== 'completed' && newStatus !== 'cancelled') {
                    Alert.alert('Invalid Action', 'From In-Progress, you can only move to Completed or Cancelled');
                    return;
                }
            }

            // From completed or cancelled: no changes allowed
            if (currentStatus === 'completed' || currentStatus === 'cancelled') {
                Alert.alert('Invalid Action', 'Cannot change status from ' + booking.status);
                return;
            }

            setSelectedStatus(status);

            if (status === 'cancelled') {
                setShowCancellationInput(true);
            } else {
                setShowCancellationInput(false);
                setCancellationReason('');
            }
        };

        const handleUpdateStatus = async () => {
            if (selectedStatus === 'cancelled' && !cancellationReason.trim()) {
                Alert.alert('Error', 'Please provide a reason for cancellation');
                return;
            }
            if (selectedStatus === booking.status && selectedStatus !== 'cancelled') {
                Alert.alert('Info', 'Status is already set to ' + selectedStatus);
                return;
            }

            // Check if we need odometer readings
            if ((selectedStatus === 'in-progress' || selectedStatus === 'completed') && booking.vehicle_assignments.length === 0) {
                Alert.alert('Error', 'No vehicles assigned to this booking');
                return;
            }

            // Only set loading for non-odometer status updates
            if (selectedStatus !== 'in-progress' && selectedStatus !== 'completed') {
                setIsUpdating(true);
            }

            await onUpdateStatus(booking.id, selectedStatus, cancellationReason);

            if (selectedStatus !== 'in-progress' && selectedStatus !== 'completed') {
                setIsUpdating(false);
            }

            setShowCancellationInput(false);
            setCancellationReason('');
        };

        const assignments = booking.vehicle_assignments || [];
        const hasMultipleVehicles = assignments.length > 1;
        const firstVehicle = assignments.length > 0 ? assignments[0].vehicle : null;

        return (
            <Animated.View style={[styles.bookingCard, { transform: [{ translateY: slideAnim }] }]}>
                <View style={styles.bookingCardHeader}>
                    <View style={styles.vehicleInfo}>
                        {firstVehicle && (
                            <Image
                                source={{ uri: firstVehicle.vehicle_photos?.[0]?.photo || 'https://via.placeholder.com/56' }}
                                style={styles.vehicleImage}
                            />
                        )}
                        <View style={{ marginLeft: 12, flex: 1 }}>
                            <Text style={styles.vehicleName}>
                                {hasMultipleVehicles
                                    ? `${assignments.length} Vehicles`
                                    : firstVehicle
                                        ? `${firstVehicle.make} ${firstVehicle.model}`
                                        : 'Vehicle'}
                            </Text>
                            <Text style={styles.plateText}>
                                {firstVehicle?.license_plate || 'N/A'}
                            </Text>
                        </View>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(booking.status)}20` }]}>
                        <MaterialCommunityIcons
                            name={getStatusIconBooking(booking.status)}
                            size={14}
                            color={getStatusColor(booking.status)}
                        />
                        <Text style={[styles.statusText, { color: getStatusColor(booking.status) }]}>
                            {booking.status}
                        </Text>
                    </View>
                </View>

                {/* Vehicle Assignments Section */}
                {assignments.length > 0 && (
                    <View style={styles.assignmentsSection}>
                        <Text style={styles.assignmentsSectionTitle}>Assigned Vehicles & Drivers</Text>
                        {assignments.map((assignment) => (
                            <View key={assignment.id} style={styles.assignmentCard}>
                                <View style={styles.assignmentRow}>
                                    <MaterialCommunityIcons name="car" size={18} color="#008069" />
                                    <Text style={styles.assignmentVehicleText}>
                                        {assignment.vehicle.make} {assignment.vehicle.model} ({assignment.vehicle.license_plate})
                                    </Text>
                                </View>
                                <View style={styles.driverRow}>
                                    <MaterialCommunityIcons
                                        name="account-circle"
                                        size={18}
                                        color={assignment.assigned_driver ? "#00d285" : "#999"}
                                    />
                                    <Text style={[
                                        styles.driverText,
                                        !assignment.assigned_driver && styles.noDriverText
                                    ]}>
                                        {assignment.assigned_driver
                                            ? assignment.assigned_driver.full_name
                                            : 'No driver assigned'}
                                    </Text>
                                    <TouchableOpacity
                                        style={[
                                            styles.changeDriverButton,
                                            (booking.status.toLowerCase() === 'completed' || booking.status.toLowerCase() === 'cancelled') && {
                                                opacity: 0.5,
                                                backgroundColor: '#f0f0f0'
                                            }
                                        ]}
                                        onPress={() => onOpenDriverModal(assignment)}
                                        disabled={booking.status.toLowerCase() === 'completed' || booking.status.toLowerCase() === 'cancelled'}
                                    >
                                        <MaterialCommunityIcons
                                            name="pencil"
                                            size={16}
                                            color={
                                                (booking.status.toLowerCase() === 'completed' || booking.status.toLowerCase() === 'cancelled')
                                                    ? '#999'
                                                    : '#008069'
                                            }
                                        />
                                        <Text style={[
                                            styles.changeDriverText,
                                            (booking.status.toLowerCase() === 'completed' || booking.status.toLowerCase() === 'cancelled') && {
                                                color: '#999'
                                            }
                                        ]}>
                                            {assignment.assigned_driver ? 'Change' : 'Assign'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))}
                    </View>
                )}

                {/* Odometer Readings - Show for completed bookings */}
                {booking.status === 'completed' && assignments.length > 0 && (
                    <View style={styles.odometerSection}>
                        <Text style={styles.odometerSectionTitle}>Odometer Readings</Text>
                        {assignments.map((assignment) => (
                            <View key={`odometer-${assignment.id}`} style={styles.odometerCard}>
                                <Text style={styles.odometerVehicleText}>
                                    {assignment.vehicle.license_plate}
                                </Text>
                                <View style={styles.odometerReadings}>
                                    <View style={styles.odometerReading}>
                                        <MaterialCommunityIcons name="speedometer" size={16} color="#008069" />
                                        <Text style={styles.odometerLabel}>Start:</Text>
                                        <Text style={styles.odometerValue}>
                                            {assignment.odometer_start_reading || 'N/A'}
                                        </Text>
                                    </View>
                                    <View style={styles.odometerReading}>
                                        <MaterialCommunityIcons name="speedometer" size={16} color="#FF3B30" />
                                        <Text style={styles.odometerLabel}>End:</Text>
                                        <Text style={styles.odometerValue}>
                                            {assignment.odometer_end_reading || 'N/A'}
                                        </Text>
                                    </View>
                                    {assignment.odometer_start_reading && assignment.odometer_end_reading && (
                                        <View style={styles.odometerReading}>
                                            <MaterialCommunityIcons name="map-marker-distance" size={16} color="#666" />
                                            <Text style={styles.odometerLabel}>Distance:</Text>
                                            <Text style={styles.odometerValue}>
                                                {(parseInt(assignment.odometer_end_reading) - parseInt(assignment.odometer_start_reading)).toLocaleString()} km
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            </View>
                        ))}
                    </View>
                )}

                <View style={styles.bookingCardBody}>
                    <View style={styles.locationRow}>
                        <MaterialCommunityIcons name="account" size={16} color="#666" />
                        <Text style={styles.locationText}>
                            {booking.booked_for?.full_name || 'Unknown'}
                        </Text>
                    </View>
                    <View style={styles.locationRow}>
                        <MaterialCommunityIcons name="map-marker" size={16} color="#00d285" />
                        <Text style={styles.locationText}>{booking.start_location}</Text>
                    </View>
                    <View style={styles.arrowContainer}>
                        <MaterialCommunityIcons name="arrow-down" size={16} color="#ccc" />
                    </View>
                    <View style={styles.locationRow}>
                        <MaterialCommunityIcons name="map-marker" size={16} color="#ff5e7a" />
                        <Text style={styles.locationText}>{booking.end_location}</Text>
                    </View>
                    {booking.purpose && (
                        <View style={styles.locationRow}>
                            <MaterialCommunityIcons name="information" size={16} color="#666" />
                            <Text style={styles.locationText}>{booking.purpose}</Text>
                        </View>
                    )}
                </View>

                <View style={styles.bookingCardFooter}>
                    <View style={styles.dateTimeInfo}>
                        <MaterialCommunityIcons name="calendar" size={16} color="#666" />
                        <Text style={styles.dateTimeInfoText}>
                            {new Date(booking.start_time).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                            })}
                        </Text>
                    </View>
                    <View style={styles.dateTimeInfo}>
                        <MaterialCommunityIcons name="clock-outline" size={16} color="#666" />
                        <Text style={styles.dateTimeInfoText}>
                            {new Date(booking.start_time).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit'
                            })}
                        </Text>
                    </View>
                </View>

                {/* End Date & Time Section */}
                {booking.end_time && (
                    <View style={[styles.bookingCardFooter, { paddingTop: 8, borderTopWidth: 0 }]}>
                        <View style={styles.dateTimeInfo}>
                            <MaterialCommunityIcons name="calendar" size={16} color="#666" />
                            <Text style={styles.dateTimeInfoText}>
                                {new Date(booking.end_time).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric'
                                })}
                            </Text>
                        </View>
                        <View style={styles.dateTimeInfo}>
                            <MaterialCommunityIcons name="clock-outline" size={16} color="#666" />
                            <Text style={styles.dateTimeInfoText}>
                                {new Date(booking.end_time).toLocaleTimeString('en-US', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })}
                            </Text>
                        </View>
                    </View>
                )}
                {booking.status.toLowerCase() !== 'completed' && booking.status.toLowerCase() !== 'cancelled' && (
                    <View style={{ marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#f0f0f0' }}>
                        <Text style={{ fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 12 }}>
                            Update Status
                        </Text>
                        <View style={styles.statusOptions}>
                            {['assigned', 'in-progress', 'completed', 'cancelled'].map((status) => {
                                const statusColor = getStatusColor(status);
                                const isSelected = selectedStatus === status;

                                // Determine if this option should be disabled
                                const currentStatus = booking.status.toLowerCase();
                                let isDisabled = false;

                                if (currentStatus === 'assigned') {
                                    isDisabled = status !== 'in-progress' && status !== 'cancelled';
                                } else if (currentStatus === 'in-progress') {
                                    isDisabled = status !== 'completed' && status !== 'cancelled';
                                } else if (currentStatus === 'completed' || currentStatus === 'cancelled') {
                                    isDisabled = true;
                                }

                                return (
                                    <TouchableOpacity
                                        key={status}
                                        style={[
                                            styles.statusOption,
                                            isSelected && { backgroundColor: statusColor, borderColor: statusColor },
                                            isDisabled && { opacity: 0.4, backgroundColor: '#f5f5f5' }
                                        ]}
                                        onPress={() => !isDisabled && handleStatusChange(status)}
                                        disabled={isDisabled}
                                    >
                                        <MaterialCommunityIcons
                                            name={getStatusIconBooking(status)}
                                            size={16}
                                            color={isSelected ? '#FFFFFF' : isDisabled ? '#999' : statusColor}
                                        />
                                        <Text
                                            style={[
                                                styles.statusOptionText,
                                                { color: isSelected ? '#FFFFFF' : isDisabled ? '#999' : statusColor }
                                            ]}
                                        >
                                            {status.toUpperCase()}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {showCancellationInput && (
                            <View style={{ marginTop: 12 }}>
                                <View style={styles.inputContainer}>
                                    <MaterialIcons name="warning" size={20} color="#FF3B30" style={styles.inputIcon} />
                                    <TextInput
                                        style={[styles.textInput, { minHeight: 80 }]}
                                        value={cancellationReason}
                                        onChangeText={setCancellationReason}
                                        placeholder="Reason for cancellation (required)"
                                        placeholderTextColor="#888"
                                        multiline
                                        numberOfLines={3}
                                        textAlignVertical="top"
                                    />
                                </View>
                            </View>
                        )}

                        {selectedStatus !== booking.status && (
                            <TouchableOpacity
                                style={[
                                    styles.updateButton,
                                    { marginTop: 12 },
                                    (isUpdating || updating) && { backgroundColor: '#ccc' }
                                ]}
                                onPress={handleUpdateStatus}
                                disabled={isUpdating || updating}
                            >
                                {isUpdating || updating ? (
                                    <ActivityIndicator color="#FFFFFF" size="small" />
                                ) : (
                                    <>
                                        <MaterialCommunityIcons name="check-circle" size={20} color="#FFFFFF" />
                                        <Text style={styles.updateButtonText}>Update to {selectedStatus}</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        )}
                    </View>
                )}
            </Animated.View>
        );
    };

    const photos = selectedVehicle?.vehicle_photos || [];

    const renderUpdateVehiclePage = () => (
        <View style={styles.container}>
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
                                                resizeMode="contain"
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
                                            resizeMode="contain"
                                        />
                                    </View>
                                ))}
                            </ScrollView>

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
                                {['available', 'not_available', 'in_maintenance', 'booked'].map((status) => {
                                    let buttonColor = '#8E8E93';
                                    if (status === 'available') buttonColor = '#00d285';
                                    if (status === 'not_available') buttonColor = '#FF3B30';
                                    if (status === 'in_maintenance') buttonColor = '#8E8E93';
                                    if (status === 'booked') buttonColor = '#FF9500';

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
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                            >
                                <TouchableOpacity
                                    style={styles.actionButton}
                                    onPress={() => {
                                        if (selectedVehicle) {
                                            fetchCarBookings(selectedVehicle.id);
                                        }
                                    }}
                                >
                                    <MaterialCommunityIcons name="calendar-check" size={24} color="#008069" />
                                    <Text style={styles.actionButtonText}>Show Bookings</Text>
                                </TouchableOpacity>
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

                                <TouchableOpacity style={styles.actionButton} onPress={() => setIsDownloadReportModalVisible(true)}>
                                    <MaterialCommunityIcons name="file-download" size={24} color="#008069" />
                                    <Text style={styles.actionButtonText}>Download Report</Text>
                                </TouchableOpacity>
                            </ScrollView>
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

        const displayStatus = getDisplayStatus(item);
        const statusText = getStatusDisplayText(item);

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
                    resizeMode="contain"
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
                        <View style={[styles.vehicleStatusBadge, { backgroundColor: getStatusColor(displayStatus) }]}>
                            <Text style={styles.vehicleStatusText}>{statusText}</Text>
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
                                <View style={[styles.headerCenter, { marginRight: 60, height: 40 }]}>
    <Text style={[styles.logoText, { marginTop: 6 }]}>CITADEL</Text>
</View>
<TouchableOpacity
    style={{
        position: 'absolute',
        right: 0,
        backgroundColor: 'transparent',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6
    }}
    onPress={() => {
        setCurrentView('create-vehicle');
    }}
>
    <MaterialCommunityIcons name="plus" size={20} color="#FFFFFF" />
    <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 14 }}>Add</Text>
</TouchableOpacity>
                            </View>
                        </View>
                        <View style={styles.titleSection}>
                            <Text style={styles.headerTitle}>Vehicles</Text>
                            <Text style={[styles.headerSubtitle, { textAlign: 'left' }]}>
                                {vehicles.length} vehicle{vehicles.length !== 1 ? 's' : ''} in {city}
                            </Text>
                        </View>
                    </LinearGradient>
                </View>

                <View style={[styles.tabContainer, { backgroundColor: '#fff', padding: 0 }]}>
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
                                        setCurrentView('create-vehicle');
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
            case 'create-vehicle':
                return (
                    <CreateCar
                        token={token}
                        city={city}
                        onBack={() => {
                            setCurrentView('main');
                            fetchVehicles();
                        }}
                        onCarCreated={() => {
                            setCurrentView('main');
                            fetchVehicles();
                        }}
                    />
                );
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

            {/* Car Bookings Modal */}
            {/* Car Bookings Modal - COMPLETELY FIXED VERSION */}
            <Modal
                visible={isCarBookingsModalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setIsCarBookingsModalVisible(false)}
            >
                <View style={{
                    flex: 1,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    justifyContent: 'flex-end'
                }}>
                    <View style={{
                        backgroundColor: '#FFFFFF',
                        borderTopLeftRadius: 20,
                        borderTopRightRadius: 20,
                        maxHeight: '90%',
                        height: '90%',
                    }}>
                        {/* Header */}
                        <View style={{
                            backgroundColor: '#008069',
                            paddingTop: Platform.OS === 'ios' ? 50 : 40,
                            paddingBottom: 16,
                            paddingHorizontal: 20,
                            borderTopLeftRadius: 20,
                            borderTopRightRadius: 20,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                        }}>
                            <View style={{ flex: 1 }}>
                                <Text style={{
                                    fontSize: 18,
                                    fontWeight: '700',
                                    color: '#FFFFFF',
                                    marginBottom: 4,
                                }}>
                                    Vehicle Bookings
                                </Text>
                                <Text style={{
                                    fontSize: 13,
                                    color: 'rgba(255, 255, 255, 0.8)'
                                }}>
                                    {selectedVehicle?.make} {selectedVehicle?.model} ({selectedVehicle?.license_plate})
                                </Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => setIsCarBookingsModalVisible(false)}
                                style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: 20,
                                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <MaterialCommunityIcons name="close" size={24} color="#FFFFFF" />
                            </TouchableOpacity>
                        </View>

                        {/* Content */}
                        {loadingCarBookings ? (
                            <View style={{
                                flex: 1,
                                justifyContent: 'center',
                                alignItems: 'center',
                                paddingVertical: 60,
                            }}>
                                <ActivityIndicator size="large" color="#008069" />
                                <Text style={{
                                    marginTop: 16,
                                    color: '#666',
                                    fontSize: 14
                                }}>
                                    Loading bookings...
                                </Text>
                            </View>
                        ) : carBookings.length === 0 ? (
                            <View style={{
                                flex: 1,
                                justifyContent: 'center',
                                alignItems: 'center',
                                paddingVertical: 60,
                                paddingHorizontal: 32,
                            }}>
                                <MaterialCommunityIcons name="calendar-remove" size={80} color="#E0E0E0" />
                                <Text style={{
                                    fontSize: 18,
                                    fontWeight: '600',
                                    color: '#333',
                                    marginTop: 20,
                                    marginBottom: 8,
                                }}>
                                    No Bookings Found
                                </Text>
                                <Text style={{
                                    fontSize: 14,
                                    color: '#666',
                                    textAlign: 'center',
                                }}>
                                    This vehicle has no bookings yet.
                                </Text>
                            </View>
                        ) : (
                            <ScrollView
                                style={{ flex: 1, backgroundColor: '#F5F5F5' }}
                                contentContainerStyle={{
                                    padding: 16,
                                    paddingBottom: 40,
                                }}
                                showsVerticalScrollIndicator={true}
                            >
                                {/* Success Banner */}
                                <View style={{
                                    backgroundColor: '#E8F5E9',
                                    padding: 16,
                                    borderRadius: 12,
                                    marginBottom: 20,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    borderLeftWidth: 4,
                                    borderLeftColor: '#008069',
                                }}>
                                    <MaterialCommunityIcons name="check-circle" size={24} color="#008069" />
                                    <Text style={{
                                        fontSize: 15,
                                        fontWeight: '600',
                                        color: '#008069',
                                        marginLeft: 12,
                                    }}>
                                        Found {carBookings.length} booking{carBookings.length !== 1 ? 's' : ''}
                                    </Text>
                                </View>

                                {/* Render Each Booking */}
                                {carBookings.map((booking, index) => {
                                    const assignments = booking.vehicle_assignments || [];
                                    const firstVehicle = assignments.length > 0 ? assignments[0].vehicle : null;

                                    return (
                                        <View
                                            key={`booking-${booking.id}`}
                                            style={{
                                                backgroundColor: '#FFFFFF',
                                                borderRadius: 16,
                                                padding: 16,
                                                marginBottom: 16,
                                                shadowColor: '#000',
                                                shadowOffset: { width: 0, height: 2 },
                                                shadowOpacity: 0.1,
                                                shadowRadius: 8,
                                                elevation: 3,
                                                borderLeftWidth: 4,
                                                borderLeftColor: getStatusColor(booking.status),
                                            }}
                                        >
                                            {/* Booking Header */}
                                            <View style={{
                                                flexDirection: 'row',
                                                justifyContent: 'space-between',
                                                alignItems: 'flex-start',
                                                marginBottom: 16,
                                            }}>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={{
                                                        fontSize: 16,
                                                        fontWeight: '700',
                                                        color: '#1A1A1A',
                                                        marginBottom: 4,
                                                    }}>
                                                        Booking #{booking.id}
                                                    </Text>
                                                    <Text style={{
                                                        fontSize: 14,
                                                        color: '#666',
                                                    }}>
                                                        {booking.booked_for?.full_name || 'Unknown'}
                                                    </Text>
                                                </View>
                                                <View style={{
                                                    backgroundColor: `${getStatusColor(booking.status)}20`,
                                                    paddingHorizontal: 12,
                                                    paddingVertical: 6,
                                                    borderRadius: 12,
                                                    flexDirection: 'row',
                                                    alignItems: 'center',
                                                    gap: 6,
                                                }}>
                                                    <MaterialCommunityIcons
                                                        name={getStatusIconBooking(booking.status)}
                                                        size={14}
                                                        color={getStatusColor(booking.status)}
                                                    />
                                                    <Text style={{
                                                        fontSize: 12,
                                                        fontWeight: '600',
                                                        color: getStatusColor(booking.status),
                                                        textTransform: 'capitalize',
                                                    }}>
                                                        {booking.status}
                                                    </Text>
                                                </View>
                                            </View>

                                            {/* Vehicle & Driver Info */}
                                            {assignments.length > 0 && (
                                                <View style={{
                                                    backgroundColor: '#F8F9FA',
                                                    borderRadius: 12,
                                                    padding: 12,
                                                    marginBottom: 16,
                                                }}>
                                                    <Text style={{
                                                        fontSize: 13,
                                                        fontWeight: '600',
                                                        color: '#666',
                                                        marginBottom: 12,
                                                    }}>
                                                        ASSIGNED VEHICLES & DRIVERS
                                                    </Text>
                                                    {assignments.map((assignment) => (
                                                        <View
                                                            key={assignment.id}
                                                            style={{
                                                                backgroundColor: '#FFFFFF',
                                                                borderRadius: 8,
                                                                padding: 12,
                                                                marginBottom: 8,
                                                            }}
                                                        >
                                                            <View style={{
                                                                flexDirection: 'row',
                                                                alignItems: 'center',
                                                                marginBottom: 8,
                                                            }}>
                                                                <MaterialCommunityIcons
                                                                    name="car"
                                                                    size={18}
                                                                    color="#008069"
                                                                />
                                                                <Text style={{
                                                                    fontSize: 14,
                                                                    fontWeight: '500',
                                                                    color: '#333',
                                                                    marginLeft: 8,
                                                                    flex: 1,
                                                                }}>
                                                                    {assignment.vehicle.make} {assignment.vehicle.model}
                                                                </Text>
                                                                <Text style={{
                                                                    fontSize: 12,
                                                                    color: '#666',
                                                                    fontWeight: '600',
                                                                }}>
                                                                    {assignment.vehicle.license_plate}
                                                                </Text>
                                                            </View>
                                                            <View style={{
                                                                flexDirection: 'row',
                                                                alignItems: 'center',
                                                                justifyContent: 'space-between',
                                                            }}>
                                                                <View style={{
                                                                    flexDirection: 'row',
                                                                    alignItems: 'center',
                                                                    flex: 1,
                                                                }}>
                                                                    <MaterialCommunityIcons
                                                                        name="account-circle"
                                                                        size={18}
                                                                        color={assignment.assigned_driver ? "#00d285" : "#999"}
                                                                    />
                                                                    <Text style={{
                                                                        fontSize: 13,
                                                                        color: assignment.assigned_driver ? '#333' : '#999',
                                                                        marginLeft: 8,
                                                                        fontStyle: assignment.assigned_driver ? 'normal' : 'italic',
                                                                    }}>
                                                                        {assignment.assigned_driver?.full_name || 'No driver assigned'}
                                                                    </Text>
                                                                </View>
                                                                {booking.status.toLowerCase() !== 'completed' &&
                                                                    booking.status.toLowerCase() !== 'cancelled' && (
                                                                        <TouchableOpacity
                                                                            onPress={() => handleOpenDriverModal(assignment)}
                                                                            style={{
                                                                                flexDirection: 'row',
                                                                                alignItems: 'center',
                                                                                backgroundColor: '#E8F5E9',
                                                                                paddingHorizontal: 10,
                                                                                paddingVertical: 6,
                                                                                borderRadius: 6,
                                                                                gap: 4,
                                                                            }}
                                                                        >
                                                                            <MaterialCommunityIcons
                                                                                name="pencil"
                                                                                size={14}
                                                                                color="#008069"
                                                                            />
                                                                            <Text style={{
                                                                                fontSize: 12,
                                                                                color: '#008069',
                                                                                fontWeight: '600',
                                                                            }}>
                                                                                {assignment.assigned_driver ? 'Change' : 'Assign'}
                                                                            </Text>
                                                                        </TouchableOpacity>
                                                                    )}
                                                            </View>
                                                        </View>
                                                    ))}
                                                </View>
                                            )}

                                            {/* Trip Details */}
                                            <View style={{ marginBottom: 16 }}>
                                                <View style={{
                                                    flexDirection: 'row',
                                                    alignItems: 'center',
                                                    marginBottom: 8,
                                                }}>
                                                    <MaterialCommunityIcons name="map-marker" size={18} color="#00d285" />
                                                    <Text style={{
                                                        fontSize: 14,
                                                        color: '#333',
                                                        marginLeft: 10,
                                                    }}>
                                                        {booking.start_location}
                                                    </Text>
                                                </View>
                                                <View style={{
                                                    marginLeft: 9,
                                                    marginVertical: 4,
                                                }}>
                                                    <MaterialCommunityIcons name="arrow-down" size={16} color="#ccc" />
                                                </View>
                                                <View style={{
                                                    flexDirection: 'row',
                                                    alignItems: 'center',
                                                    marginBottom: 8,
                                                }}>
                                                    <MaterialCommunityIcons name="map-marker" size={18} color="#ff5e7a" />
                                                    <Text style={{
                                                        fontSize: 14,
                                                        color: '#333',
                                                        marginLeft: 10,
                                                    }}>
                                                        {booking.end_location}
                                                    </Text>
                                                </View>
                                                {booking.purpose && (
                                                    <View style={{
                                                        flexDirection: 'row',
                                                        alignItems: 'center',
                                                    }}>
                                                        <MaterialCommunityIcons name="information" size={18} color="#666" />
                                                        <Text style={{
                                                            fontSize: 14,
                                                            color: '#666',
                                                            marginLeft: 10,
                                                        }}>
                                                            {booking.purpose}
                                                        </Text>
                                                    </View>
                                                )}
                                            </View>

                                            {/* Dates */}
                                            <View style={{
                                                flexDirection: 'row',
                                                gap: 16,
                                                paddingTop: 12,
                                                borderTopWidth: 1,
                                                borderTopColor: '#F0F0F0',
                                            }}>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                                    <MaterialCommunityIcons name="calendar" size={16} color="#666" />
                                                    <Text style={{ fontSize: 13, color: '#666' }}>
                                                        {new Date(booking.start_time).toLocaleDateString('en-US', {
                                                            month: 'short',
                                                            day: 'numeric',
                                                        })}
                                                    </Text>
                                                </View>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                                    <MaterialCommunityIcons name="clock-outline" size={16} color="#666" />
                                                    <Text style={{ fontSize: 13, color: '#666' }}>
                                                        {new Date(booking.start_time).toLocaleTimeString('en-US', {
                                                            hour: '2-digit',
                                                            minute: '2-digit',
                                                        })}
                                                    </Text>
                                                </View>
                                            </View>

                                            {/* Status Update Actions */}
                                            {booking.status.toLowerCase() !== 'completed' &&
                                                booking.status.toLowerCase() !== 'cancelled' && (
                                                    <View style={{
                                                        marginTop: 16,
                                                        paddingTop: 16,
                                                        borderTopWidth: 1,
                                                        borderTopColor: '#F0F0F0',
                                                    }}>
                                                        <Text style={{
                                                            fontSize: 13,
                                                            fontWeight: '600',
                                                            color: '#666',
                                                            marginBottom: 12,
                                                        }}>
                                                            QUICK ACTIONS
                                                        </Text>
                                                        <View style={{
                                                            flexDirection: 'row',
                                                            flexWrap: 'wrap',
                                                            gap: 8,
                                                        }}>
                                                            {['assigned', 'in-progress', 'completed', 'cancelled'].map((status) => {
                                                                const currentStatus = booking.status.toLowerCase();
                                                                let isDisabled = false;

                                                                if (currentStatus === 'assigned') {
                                                                    isDisabled = status !== 'in-progress' && status !== 'cancelled';
                                                                } else if (currentStatus === 'in-progress') {
                                                                    isDisabled = status !== 'completed' && status !== 'cancelled';
                                                                }

                                                                if (isDisabled) return null;

                                                                return (
                                                                    <TouchableOpacity
                                                                        key={status}
                                                                        onPress={() => updateBookingStatus(booking.id, status)}
                                                                        style={{
                                                                            flexDirection: 'row',
                                                                            alignItems: 'center',
                                                                            backgroundColor: '#FFFFFF',
                                                                            paddingHorizontal: 14,
                                                                            paddingVertical: 10,
                                                                            borderRadius: 8,
                                                                            borderWidth: 1.5,
                                                                            borderColor: getStatusColor(status),
                                                                            gap: 6,
                                                                            minWidth: '45%',
                                                                            justifyContent: 'center',
                                                                        }}
                                                                    >
                                                                        <MaterialCommunityIcons
                                                                            name={getStatusIconBooking(status)}
                                                                            size={16}
                                                                            color={getStatusColor(status)}
                                                                        />
                                                                        <Text style={{
                                                                            fontSize: 13,
                                                                            fontWeight: '600',
                                                                            color: getStatusColor(status),
                                                                        }}>
                                                                            {status === 'in-progress' ? 'Start' :
                                                                                status === 'completed' ? 'Complete' :
                                                                                    status === 'cancelled' ? 'Cancel' : 'Assign'}
                                                                        </Text>
                                                                    </TouchableOpacity>
                                                                );
                                                            })}
                                                        </View>
                                                    </View>
                                                )}
                                        </View>
                                    );
                                })}
                            </ScrollView>
                        )}
                    </View>
                </View>
            </Modal>

            {/* Driver Selection Modal */}
            <Modal
                visible={isDriverModalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setIsDriverModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select Driver</Text>
                            <TouchableOpacity onPress={() => setIsDriverModalVisible(false)}>
                                <MaterialCommunityIcons name="close" size={24} color="#333" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.driverList}>
                            {loadingDrivers ? (
                                <ActivityIndicator size="large" color="#008069" style={{ marginTop: 20 }} />
                            ) : availableDrivers.length === 0 ? (
                                <Text style={styles.noDriversText}>No drivers available</Text>
                            ) : (
                                availableDrivers.map((driver) => (
                                    <TouchableOpacity
                                        key={driver.employee_id}
                                        style={[
                                            styles.driverOption,
                                            selectedDriverId === driver.employee_id && styles.selectedDriverOption
                                        ]}
                                        onPress={() => setSelectedDriverId(driver.employee_id)}
                                    >
                                        <View style={styles.driverOptionContent}>
                                            {driver.profile_picture ? (
                                                <Image
                                                    source={{ uri: driver.profile_picture }}
                                                    style={styles.driverAvatar}
                                                />
                                            ) : (
                                                <View style={styles.driverAvatarPlaceholder}>
                                                    <MaterialCommunityIcons name="account" size={24} color="#999" />
                                                </View>
                                            )}
                                            <View style={styles.driverInfo}>
                                                <Text style={styles.driverName}>{driver.full_name}</Text>
                                            </View>
                                        </View>
                                        {selectedDriverId === driver.employee_id && (
                                            <MaterialCommunityIcons name="check-circle" size={24} color="#008069" />
                                        )}
                                    </TouchableOpacity>
                                ))
                            )}
                        </ScrollView>

                        <View style={styles.modalFooter}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={() => setIsDriverModalVisible(false)}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.confirmButton, !selectedDriverId && styles.disabledButton]}
                                onPress={updateDriverAssignment}
                                disabled={!selectedDriverId}
                            >
                                <Text style={styles.confirmButtonText}>Confirm</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Odometer Reading Modal */}
            <Modal
                visible={odometerModal.visible}
                transparent={true}
                animationType="slide"
            >
                <View style={{
                    flex: 1,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    justifyContent: 'center',
                    alignItems: 'center',
                    padding: 20,
                }}>
                    <View style={{
                        backgroundColor: '#FFFFFF',
                        borderRadius: 20,
                        width: '100%',
                        maxWidth: 500,
                        height: 600,
                        overflow: 'hidden',
                    }}>
                        {/* Header - Fixed height */}
                        <View style={{
                            backgroundColor: '#075E54',
                            paddingVertical: 16,
                            paddingHorizontal: 20,
                            height: 80,
                        }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 18, fontWeight: '700', color: '#FFFFFF' }}>
                                        {odometerModal.type === 'start' ? 'Start Trip' : 'Complete Trip'}
                                    </Text>
                                    <Text style={{ fontSize: 13, color: '#FFFFFF', marginTop: 4 }}>
                                        Enter odometer readings
                                    </Text>
                                </View>
                                <TouchableOpacity
                                    onPress={() => {
                                        if (!submittingOdometer) {
                                            setOdometerModal({
                                                visible: false,
                                                type: 'start',
                                                bookingId: null,
                                                selectedStatus: '',
                                                cancellationReason: undefined,
                                                assignments: [],
                                            });
                                            setOdometerReadings({});
                                        }
                                    }}
                                    disabled={submittingOdometer}
                                    style={{ padding: 4 }}
                                >
                                    <MaterialCommunityIcons name="close" size={24} color="#FFFFFF" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Content - ScrollView with calculated height */}
                        <ScrollView
                            style={{
                                height: 440,
                            }}
                            contentContainerStyle={{
                                padding: 20,
                                paddingBottom: 40,
                            }}
                            showsVerticalScrollIndicator={true}
                        >
                            {/* Info Icon */}
                            <View style={{ alignItems: 'center', marginBottom: 20 }}>
                                <View style={{
                                    width: 60,
                                    height: 60,
                                    borderRadius: 30,
                                    backgroundColor: '#E8F5E9',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginBottom: 10
                                }}>
                                    <MaterialCommunityIcons name="speedometer" size={30} color="#008069" />
                                </View>
                                <Text style={{ fontSize: 14, color: '#666', textAlign: 'center' }}>
                                    Enter readings for all {odometerModal.assignments.length} vehicle(s)
                                </Text>
                            </View>

                            {/* VEHICLE INPUTS */}
                            {odometerModal.assignments.map((assignment, index) => (
                                <View
                                    key={assignment.id}
                                    style={{
                                        backgroundColor: '#F5F5F5',
                                        borderRadius: 12,
                                        padding: 16,
                                        marginBottom: 16,
                                    }}
                                >
                                    {/* Vehicle Header */}
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                                        <View style={{
                                            width: 32,
                                            height: 32,
                                            borderRadius: 16,
                                            backgroundColor: '#008069',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            marginRight: 10
                                        }}>
                                            <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: 'bold' }}>
                                                {index + 1}
                                            </Text>
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={{ fontSize: 15, fontWeight: 'bold', color: '#000' }}>
                                                {assignment.vehicle.make} {assignment.vehicle.model}
                                            </Text>
                                            <Text style={{ fontSize: 13, color: '#666' }}>
                                                {assignment.vehicle.license_plate}
                                            </Text>
                                        </View>
                                    </View>

                                    {/* Input */}
                                    <View style={{
                                        backgroundColor: '#FFFFFF',
                                        borderRadius: 8,
                                        borderWidth: 2,
                                        borderColor: odometerReadings[assignment.id] ? '#008069' : '#DDD',
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        paddingHorizontal: 12,
                                        height: 50,
                                    }}>
                                        <MaterialCommunityIcons
                                            name="speedometer"
                                            size={20}
                                            color={odometerReadings[assignment.id] ? '#008069' : '#999'}
                                        />
                                        <TextInput
                                            style={{
                                                flex: 1,
                                                paddingVertical: 0,
                                                paddingHorizontal: 10,
                                                fontSize: 16,
                                                color: '#000',
                                                height: 50,
                                            }}
                                            value={odometerReadings[assignment.id] || ''}
                                            onChangeText={(text) => {
                                                const numeric = text.replace(/[^0-9]/g, '');
                                                setOdometerReadings(prev => ({
                                                    ...prev,
                                                    [assignment.id]: numeric
                                                }));
                                            }}
                                            placeholder="Enter reading"
                                            placeholderTextColor="#999"
                                            keyboardType="numeric"
                                            editable={!submittingOdometer}
                                        />
                                        <Text style={{ fontSize: 13, color: '#666' }}>km</Text>
                                    </View>

                                    {/* Success Message */}
                                    {odometerReadings[assignment.id] && (
                                        <View style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            marginTop: 8,
                                            backgroundColor: '#E8F5E9',
                                            padding: 6,
                                            borderRadius: 6
                                        }}>
                                            <MaterialCommunityIcons name="check-circle" size={14} color="#008069" />
                                            <Text style={{ fontSize: 11, color: '#008069', marginLeft: 4, fontWeight: '600' }}>
                                                Recorded: {Number(odometerReadings[assignment.id]).toLocaleString()} km
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            ))}
                        </ScrollView>

                        {/* Footer - Fixed height */}
                        <View style={{
                            flexDirection: 'row',
                            padding: 16,
                            borderTopWidth: 1,
                            borderTopColor: '#EEE',
                            height: 80,
                            backgroundColor: '#FAFAFA',
                        }}>
                            <TouchableOpacity
                                style={{
                                    flex: 1,
                                    paddingVertical: 12,
                                    backgroundColor: '#FFF',
                                    borderRadius: 8,
                                    borderWidth: 1,
                                    borderColor: '#DDD',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginRight: 8,
                                }}
                                onPress={() => {
                                    if (!submittingOdometer) {
                                        setOdometerModal({
                                            visible: false,
                                            type: 'start',
                                            bookingId: null,
                                            selectedStatus: '',
                                            cancellationReason: undefined,
                                            assignments: [],
                                        });
                                        setOdometerReadings({});
                                    }
                                }}
                                disabled={submittingOdometer}
                            >
                                <Text style={{ fontSize: 15, fontWeight: '600', color: '#666' }}>Cancel</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={{
                                    flex: 1,
                                    paddingVertical: 12,
                                    backgroundColor: (Object.keys(odometerReadings).length === odometerModal.assignments.length && !submittingOdometer) ? '#008069' : '#CCC',
                                    borderRadius: 8,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginLeft: 8,
                                }}
                                onPress={handleOdometerConfirm}
                                disabled={Object.keys(odometerReadings).length !== odometerModal.assignments.length || submittingOdometer}
                            >
                                {submittingOdometer ? (
                                    <ActivityIndicator color="#FFF" size="small" />
                                ) : (
                                    <Text style={{ fontSize: 15, fontWeight: '600', color: '#FFF' }}>
                                        Confirm
                                    </Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Download Report Modal */}
            {!showMonthPicker && !showYearPicker && (
                <Modal
                    visible={isDownloadReportModalVisible}
                    transparent={true}
                    animationType="slide"
                    onRequestClose={() => {
                        setIsDownloadReportModalVisible(false);
                        setSelectedMonth('');
                        setSelectedYear('');
                    }}
                >
                    <TouchableOpacity
                        style={styles.downloadReportModalOverlay}
                        activeOpacity={1}
                        onPress={() => {
                            setIsDownloadReportModalVisible(false);
                            setSelectedMonth('');
                            setSelectedYear('');
                        }}
                    >
                        <TouchableOpacity
                            activeOpacity={1}
                            onPress={(e) => e.stopPropagation()}
                            style={{ width: '100%' }}
                        >
                            <View style={styles.downloadReportModalContainer}>
                                <View style={styles.downloadReportModalHeader}>
                                    <View style={styles.downloadReportHeaderContent}>
                                        <MaterialCommunityIcons name="file-download" size={24} color="#008069" />
                                        <Text style={styles.downloadReportModalTitle}>Download Vehicle Report</Text>
                                    </View>
                                    <TouchableOpacity
                                        onPress={() => {
                                            setIsDownloadReportModalVisible(false);
                                            setSelectedMonth('');
                                            setSelectedYear('');
                                        }}
                                        style={styles.downloadReportCloseButton}
                                    >
                                        <Ionicons name="close" size={24} color="#666" />
                                    </TouchableOpacity>
                                </View>

                                <ScrollView style={styles.downloadReportModalContent}>
                                    <Text style={styles.downloadReportVehicleInfo}>
                                        {selectedVehicle?.make} {selectedVehicle?.model} ({selectedVehicle?.license_plate})
                                    </Text>

                                    <View style={styles.downloadReportInputGroup}>
                                        <Text style={styles.downloadReportLabel}>Select Month</Text>
                                        {Platform.OS === 'ios' ? (
                                            <TouchableOpacity
                                                style={styles.downloadReportPickerContainer}
                                                activeOpacity={0.7}
                                                onPress={() => {
                                                    setTempMonth(selectedMonth);
                                                    setShowMonthPicker(true);
                                                }}
                                            >
                                                <View style={styles.iosPickerButton} pointerEvents="none">
                                                    <Text style={[
                                                        styles.iosPickerButtonText,
                                                        !selectedMonth && { color: '#999' }
                                                    ]}>
                                                        {selectedMonth
                                                            ? generateMonthYearOptions().months.find(m => m.value === selectedMonth)?.label
                                                            : 'Choose a month...'}
                                                    </Text>
                                                    <Ionicons name="chevron-down" size={20} color="#666" />
                                                </View>
                                            </TouchableOpacity>
                                        ) : (
                                            <View style={styles.downloadReportPickerContainer}>
                                                <Picker
                                                    selectedValue={selectedMonth}
                                                    onValueChange={(value) => setSelectedMonth(value)}
                                                    style={styles.downloadReportPicker}
                                                >
                                                    <Picker.Item label="Choose a month..." value="" />
                                                    {generateMonthYearOptions().months.map((month) => (
                                                        <Picker.Item
                                                            key={month.value}
                                                            label={month.label}
                                                            value={month.value}
                                                        />
                                                    ))}
                                                </Picker>
                                            </View>
                                        )}
                                    </View>

                                    <View style={styles.downloadReportInputGroup}>
                                        <Text style={styles.downloadReportLabel}>Select Year</Text>
                                        {Platform.OS === 'ios' ? (
                                            <TouchableOpacity
                                                style={styles.downloadReportPickerContainer}
                                                activeOpacity={0.7}
                                                onPress={() => {
                                                    setTempYear(selectedYear);
                                                    setShowYearPicker(true);
                                                }}
                                            >
                                                <View style={styles.iosPickerButton} pointerEvents="none">
                                                    <Text style={[
                                                        styles.iosPickerButtonText,
                                                        !selectedYear && { color: '#999' }
                                                    ]}>
                                                        {selectedYear || 'Choose a year...'}
                                                    </Text>
                                                    <Ionicons name="chevron-down" size={20} color="#666" />
                                                </View>
                                            </TouchableOpacity>
                                        ) : (
                                            <View style={styles.downloadReportPickerContainer}>
                                                <Picker
                                                    selectedValue={selectedYear}
                                                    onValueChange={(value) => setSelectedYear(value)}
                                                    style={styles.downloadReportPicker}
                                                >
                                                    <Picker.Item label="Choose a year..." value="" />
                                                    {generateMonthYearOptions().years.map((year) => (
                                                        <Picker.Item
                                                            key={year}
                                                            label={year.toString()}
                                                            value={year.toString()}
                                                        />
                                                    ))}
                                                </Picker>
                                            </View>
                                        )}
                                    </View>
                                </ScrollView>

                                <View style={styles.downloadReportModalFooter}>
                                    <TouchableOpacity
                                        style={styles.downloadReportCancelButton}
                                        onPress={() => {
                                            setIsDownloadReportModalVisible(false);
                                            setSelectedMonth('');
                                            setSelectedYear('');
                                        }}
                                    >
                                        <Text style={styles.downloadReportCancelButtonText}>Cancel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[
                                            styles.downloadReportDownloadButton,
                                            (!selectedMonth || !selectedYear || isDownloading) && styles.downloadReportDownloadButtonDisabled
                                        ]}
                                        onPress={handleDownloadReport}
                                        disabled={!selectedMonth || !selectedYear || isDownloading}
                                    >
                                        {isDownloading ? (
                                            <ActivityIndicator color="#FFFFFF" size="small" />
                                        ) : (
                                            <>
                                                <MaterialCommunityIcons name="download" size={20} color="#FFFFFF" />
                                                <Text style={styles.downloadReportDownloadButtonText}>Download Report</Text>
                                            </>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </TouchableOpacity>
                    </TouchableOpacity>
                </Modal>
            )}

            {Platform.OS === 'ios' && showMonthPicker && (
                <Modal
                    visible={showMonthPicker}
                    transparent={true}
                    animationType="slide"
                    onRequestClose={() => {
                        setShowMonthPicker(false);
                    }}
                >
                    <View style={styles.iosPickerModalOverlay}>
                        <TouchableOpacity
                            style={{ flex: 1 }}
                            activeOpacity={1}
                            onPress={() => setShowMonthPicker(false)}
                        />
                        <View style={styles.iosPickerModalContainer}>
                            <View style={styles.iosPickerHeader}>
                                <TouchableOpacity onPress={() => {
                                    setShowMonthPicker(false);
                                }}>
                                    <Text style={styles.iosPickerCancelText}>Cancel</Text>
                                </TouchableOpacity>
                                <Text style={{ fontSize: 17, fontWeight: '600', color: '#000' }}>Select Month</Text>
                                <TouchableOpacity onPress={() => {
                                    setSelectedMonth(tempMonth);
                                    setShowMonthPicker(false);
                                }}>
                                    <Text style={styles.iosPickerDoneText}>Done</Text>
                                </TouchableOpacity>
                            </View>
                            <Picker
                                selectedValue={tempMonth}
                                onValueChange={(value) => setTempMonth(value)}
                                style={styles.iosPicker}
                            >
                                <Picker.Item label="Choose a month..." value="" />
                                {generateMonthYearOptions().months.map((month) => (
                                    <Picker.Item
                                        key={month.value}
                                        label={month.label}
                                        value={month.value}
                                    />
                                ))}
                            </Picker>
                        </View>
                    </View>
                </Modal>
            )}

            {Platform.OS === 'ios' && showYearPicker && (
                <Modal
                    visible={showYearPicker}
                    transparent={true}
                    animationType="slide"
                    onRequestClose={() => {
                        setShowYearPicker(false);
                    }}
                >
                    <View style={styles.iosPickerModalOverlay}>
                        <TouchableOpacity
                            style={{ flex: 1 }}
                            activeOpacity={1}
                            onPress={() => setShowYearPicker(false)}
                        />
                        <View style={styles.iosPickerModalContainer}>
                            <View style={styles.iosPickerHeader}>
                                <TouchableOpacity onPress={() => {
                                    setShowYearPicker(false);
                                }}>
                                    <Text style={styles.iosPickerCancelText}>Cancel</Text>
                                </TouchableOpacity>
                                <Text style={{ fontSize: 17, fontWeight: '600', color: '#000' }}>Select Year</Text>
                                <TouchableOpacity onPress={() => {
                                    setSelectedYear(tempYear);
                                    setShowYearPicker(false);
                                }}>
                                    <Text style={styles.iosPickerDoneText}>Done</Text>
                                </TouchableOpacity>
                            </View>
                            <Picker
                                selectedValue={tempYear}
                                onValueChange={(value) => setTempYear(value)}
                                style={styles.iosPicker}
                            >
                                <Picker.Item label="Choose a year..." value="" />
                                {generateMonthYearOptions().years.map((year) => (
                                    <Picker.Item
                                        key={year}
                                        label={year.toString()}
                                        value={year.toString()}
                                    />
                                ))}
                            </Picker>
                        </View>
                    </View>
                </Modal>
            )}
        </>
    );
};

export default Vehicles;