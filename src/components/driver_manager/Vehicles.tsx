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
    NativeSyntheticEvent
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialIcons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';

import { styles } from './styles';
import { VehicleImage } from './VehicleImage';
import  MaintenanceModal from './addMaintenanceModal';
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

interface VehiclesProps {
    token: string | null;
    city: string;
    onBack: () => void;
    setActiveTab: (tab: 'vehicles' | 'bookings') => void;
    activeTab: 'vehicles' | 'bookings';
    setLoading: (loading: boolean) => void;
    loading: boolean;
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

    const photos = selectedVehicle?.vehicle_photos || [];

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
                            // Navigate to update car screen
                            // You would implement this navigation
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
                        {/* ... rest of the detail view remains same as original ... */}
                        {/* The detailed view code from the original Vehicles.tsx */}
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