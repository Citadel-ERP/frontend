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
    NativeScrollEvent, // Add this import
    NativeSyntheticEvent // Add this import
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialIcons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';

import { styles } from './styles';
import { BackIcon } from './components/BackIcon';
import { VehicleImage } from './VehicleImage';
import { MaintenanceModal } from './components/modals/MaintenanceModal';
import { FuelLogModal } from './components/modals/FuelLogModal';
import { MaintenanceLogsModal } from './components/modals/MaintenanceLogsModal';
import { FuelLogsModal } from './components/modals/FuelLogsModal';
import {
    Vehicle,
    MaintenanceRecord,
    FuelLog,
    ViewType,
    Document,
} from './types';
import { BACKEND_URL } from '../../config/config';
import { formatDate, getStatusColor, getStatusIcon } from './utils';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 40;

interface VehiclesProps {
    token: string | null;
    onBack: () => void;
    setActiveTab: (tab: 'vehicles' | 'bookings') => void;
    activeTab: 'vehicles' | 'bookings';
    setLoading: (loading: boolean) => void;
    loading: boolean;
}

const Vehicles: React.FC<VehiclesProps> = ({
    token,
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

    useEffect(() => {
        if (token) {
            fetchVehicles();
        }
    }, [token]);

    const fetchVehicles = async () => {
        setLoading(true);
        try {
            console.log('Fetching vehicles from:', `${BACKEND_URL}/employee/getAssignedVehicles`);

            const response = await fetch(`${BACKEND_URL}/employee/getAssignedVehicles`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ token }),
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
                if (text.includes('Page not found')) {
                    console.error('Endpoint not found. Please check the backend URL and endpoint path.');
                    Alert.alert(
                        'Connection Error',
                        'Unable to connect to server. Please check:\n1. Backend server is running\n2. Endpoint URL is correct\n3. You have proper permissions'
                    );
                } else {
                    console.error('Non-JSON response:', text.substring(0, 200));
                    Alert.alert('Error', 'Server returned an unexpected response');
                }
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
            const response = await fetch(`${BACKEND_URL}/employee/getVehicleMaintainanceLogs`, {
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
            const response = await fetch(`${BACKEND_URL}/employee/getVehicleFuelLogs`, {
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
            const response = await fetch(`${BACKEND_URL}/employee/updateVehicleStatus`, {
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

            const response = await fetch(`${BACKEND_URL}/employee/createMaintainance`, {
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
            const response = await fetch(`${BACKEND_URL}/employee/addFuelLog`, {
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

    // Fixed handleScroll with proper typing
    const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const scrollPosition = event.nativeEvent.contentOffset.x;
        const index = Math.round(scrollPosition / CARD_WIDTH);
        setActiveIndex(index);
    };

    const photos = selectedVehicle?.vehicle_photos || [];

    const renderVehicleDetailPage = () => (
        <View style={styles.container}>
            <View style={styles.detailHeader}>
                <TouchableOpacity
                    style={styles.detailBackButton}
                    onPress={() => setCurrentView('main')}
                >
                    <BackIcon />
                </TouchableOpacity>
                <Text style={styles.detailHeaderTitle}>Vehicle Details</Text>
                <View style={styles.detailHeaderSpacer} />
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
        // Get the first vehicle photo URL, or use fallback
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
                                <Text style={styles.logoText}>CITADEL</Text>
                                <View style={{ width: 40 }} />
                            </View>
                        </View>

                        <View style={styles.titleSection}>
                            <Text style={styles.headerTitle}>My Vehicles</Text>
                            <Text style={styles.headerSubtitle}>
                                {vehicles.length} vehicle{vehicles.length !== 1 ? 's' : ''} assigned
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
                            color={activeTab === 'vehicles' ? '#008069' : '#666'}
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
                            color={activeTab === 'bookings' ? '#008069' : '#666'}
                        />
                        <Text style={[styles.tabText, activeTab === 'bookings' && styles.activeTabText]}>
                            Bookings
                        </Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.cabsListContent}>
                    {loading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color="#008069" />
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
                                <Text style={styles.emptyStateTitle}>No Vehicles Assigned</Text>
                                <Text style={styles.emptyStateMessage}>
                                    You don't have any vehicles assigned to you at the moment.
                                </Text>
                                <Text style={styles.emptyStateSuggestion}>
                                    Contact your administrator to get vehicle assignments.
                                </Text>
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