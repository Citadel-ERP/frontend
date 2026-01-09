import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Modal
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Vehicle, Driver } from './types';
import { colors } from '../../styles/theme';

interface AvailableCabsScreenProps {
    vehicles: Vehicle[];
    availableDrivers: Driver[];
    selectedVehicles: Array<{vehicle: Vehicle, driver: Driver | null}>;
    onBack: () => void;
    onUpdateSelection: (selection: Array<{vehicle: Vehicle, driver: Driver | null}>) => void;
    onProceedToBooking: () => void;
}

const BackIcon = () => (
    <View style={styles.backIcon}>
        <View style={styles.backArrow} />
        <Text style={styles.backText}>Back</Text>
    </View>
);

const AvailableCabsScreen: React.FC<AvailableCabsScreenProps> = ({
    vehicles,
    availableDrivers,
    selectedVehicles,
    onBack,
    onUpdateSelection,
    onProceedToBooking
}) => {
    const [driverModalVisible, setDriverModalVisible] = useState(false);
    const [currentVehicleIndex, setCurrentVehicleIndex] = useState<number | null>(null);

    const isVehicleSelected = (vehicleId: number) => {
        return selectedVehicles.some(sv => sv.vehicle.id === vehicleId);
    };

    const getAssignedDriver = (vehicleId: number) => {
        const selected = selectedVehicles.find(sv => sv.vehicle.id === vehicleId);
        return selected?.driver || null;
    };

    const handleSelectVehicle = (vehicle: Vehicle) => {
        if (isVehicleSelected(vehicle.id)) {
            // Deselect
            onUpdateSelection(selectedVehicles.filter(sv => sv.vehicle.id !== vehicle.id));
        } else {
            // Auto-assign first available driver
            const usedDriverIds = selectedVehicles.map(sv => sv.driver?.id).filter(Boolean);
            const availableDriver = availableDrivers.find(d => !usedDriverIds.includes(d.id)) || null;
            
            onUpdateSelection([...selectedVehicles, { vehicle, driver: availableDriver }]);
        }
    };

    const handleChangeDriver = (vehicleId: number) => {
        const index = selectedVehicles.findIndex(sv => sv.vehicle.id === vehicleId);
        setCurrentVehicleIndex(index);
        setDriverModalVisible(true);
    };

    const handleSelectDriver = (driver: Driver) => {
        if (currentVehicleIndex !== null) {
            const updated = [...selectedVehicles];
            updated[currentVehicleIndex] = {
                ...updated[currentVehicleIndex],
                driver
            };
            onUpdateSelection(updated);
        }
        setDriverModalVisible(false);
        setCurrentVehicleIndex(null);
    };

    const getAvailableDriversForSelection = () => {
        const usedDriverIds = selectedVehicles
            .filter((_, idx) => idx !== currentVehicleIndex)
            .map(sv => sv.driver?.id)
            .filter(Boolean);
        
        return availableDrivers.filter(d => !usedDriverIds.includes(d.id));
    };

    return (
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
                            <Text style={styles.headerTitle}>Available Vehicles</Text>
                            <Text style={styles.headerSubtitle}>
                                {selectedVehicles.length} vehicle{selectedVehicles.length !== 1 ? 's' : ''} selected
                            </Text>
                        </View>
                    </LinearGradient>
                </View>

                <View style={styles.cabsListContent}>
                    {vehicles.map((vehicle) => {
                        const isSelected = isVehicleSelected(vehicle.id);
                        const assignedDriver = getAssignedDriver(vehicle.id);

                        return (
                            <TouchableOpacity
                                key={vehicle.id}
                                style={[styles.cabCard, isSelected && styles.cabCardSelected]}
                                onPress={() => handleSelectVehicle(vehicle)}
                                activeOpacity={0.7}
                            >
                                {isSelected && (
                                    <View style={styles.selectedBadge}>
                                        <MaterialCommunityIcons name="check-circle" size={24} color="#00d285" />
                                    </View>
                                )}

                                <Image
                                    source={{ uri: `https://images.unsplash.com/photo-1553440569-bcc63803a83d?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80` }}
                                    style={styles.cabImage}
                                />

                                <View style={styles.cabInfo}>
                                    <Text style={styles.cabName}>{vehicle.make} {vehicle.model}</Text>
                                    <Text style={styles.cabMeta}>
                                        {vehicle.license_plate} • {vehicle.color} • {vehicle.year}
                                    </Text>

                                    <View style={styles.cabSpecs}>
                                        <View style={styles.specItem}>
                                            <MaterialCommunityIcons name="gas-station" size={14} color="#017bf9" />
                                            <Text style={styles.specText}>{vehicle.fuel_type}</Text>
                                        </View>
                                        <View style={styles.specItem}>
                                            <MaterialCommunityIcons name="seat-passenger" size={14} color="#017bf9" />
                                            <Text style={styles.specText}>{vehicle.seating_capacity} Seats</Text>
                                        </View>
                                    </View>

                                    {isSelected && (
                                        <View style={styles.driverSection}>
                                            <View style={styles.driverHeader}>
                                                <MaterialCommunityIcons name="account" size={18} color="#666" />
                                                <Text style={styles.driverHeaderText}>Assigned Driver</Text>
                                            </View>
                                            
                                            {assignedDriver ? (
                                                <View style={styles.driverInfo}>
                                                    <View style={styles.driverAvatar}>
                                                        <Text style={styles.driverAvatarText}>
                                                            {assignedDriver.full_name.split(' ').map(n => n[0]).join('')}
                                                        </Text>
                                                    </View>
                                                    <View style={styles.driverDetails}>
                                                        <Text style={styles.driverName}>{assignedDriver.full_name}</Text>
                                                        <Text style={styles.driverId}>{assignedDriver.employee_id}</Text>
                                                    </View>
                                                    <TouchableOpacity
                                                        style={styles.changeDriverBtn}
                                                        onPress={() => handleChangeDriver(vehicle.id)}
                                                    >
                                                        <Text style={styles.changeDriverText}>Change</Text>
                                                    </TouchableOpacity>
                                                </View>
                                            ) : (
                                                <TouchableOpacity
                                                    style={styles.selectDriverBtn}
                                                    onPress={() => handleChangeDriver(vehicle.id)}
                                                >
                                                    <MaterialCommunityIcons name="plus-circle" size={20} color="#017bf9" />
                                                    <Text style={styles.selectDriverText}>Select Driver</Text>
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    )}
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </ScrollView>

            {selectedVehicles.length > 0 && (
                <View style={styles.bottomBar}>
                    <View style={styles.bottomBarInfo}>
                        <Text style={styles.bottomBarCount}>{selectedVehicles.length} Vehicle{selectedVehicles.length !== 1 ? 's' : ''}</Text>
                        <Text style={styles.bottomBarSubtext}>
                            {selectedVehicles.filter(sv => sv.driver).length} driver{selectedVehicles.filter(sv => sv.driver).length !== 1 ? 's' : ''} assigned
                        </Text>
                    </View>
                    <TouchableOpacity
                        style={styles.proceedBtn}
                        onPress={onProceedToBooking}
                    >
                        <Text style={styles.proceedBtnText}>Continue</Text>
                        <MaterialCommunityIcons name="arrow-right" size={20} color="#fff" />
                    </TouchableOpacity>
                </View>
            )}

            {/* Driver Selection Modal */}
            <Modal
                visible={driverModalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setDriverModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select Driver</Text>
                            <TouchableOpacity onPress={() => setDriverModalVisible(false)}>
                                <MaterialCommunityIcons name="close" size={24} color="#333" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.driverList}>
                            {getAvailableDriversForSelection().map((driver) => (
                                <TouchableOpacity
                                    key={driver.id}
                                    style={styles.driverItem}
                                    onPress={() => handleSelectDriver(driver)}
                                >
                                    <View style={styles.driverAvatar}>
                                        <Text style={styles.driverAvatarText}>
                                            {driver.full_name.split(' ').map(n => n[0]).join('')}
                                        </Text>
                                    </View>
                                    <View style={styles.driverDetails}>
                                        <Text style={styles.driverName}>{driver.full_name}</Text>
                                        <Text style={styles.driverId}>{driver.employee_id} • {driver.email}</Text>
                                    </View>
                                    <MaterialCommunityIcons name="chevron-right" size={24} color="#ccc" />
                                </TouchableOpacity>
                            ))}
                            
                            {getAvailableDriversForSelection().length === 0 && (
                                <View style={styles.emptyState}>
                                    <MaterialCommunityIcons name="account-off" size={48} color="#ccc" />
                                    <Text style={styles.emptyText}>No available drivers</Text>
                                </View>
                            )}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
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
        paddingBottom: 100,
    },
    header: {
        position: 'relative',
        overflow: 'hidden',
    },
    headerBanner: {
        height: 200,
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
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
    },
    headerContent: {
        flex: 1,
        paddingHorizontal: 20,
        paddingVertical: 40,
        zIndex: 1,
    },
    headerTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    logoText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '800',
        letterSpacing: 1,
    },
    titleSection: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '600',
        color: '#fff',
    },
    headerSubtitle: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.8)',
        marginTop: 4,
    },
    cabsListContent: {
        padding: 16,
    },
    cabCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 3,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    cabCardSelected: {
        borderColor: '#00d285',
    },
    selectedBadge: {
        position: 'absolute',
        top: 12,
        right: 12,
        zIndex: 1,
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4,
    },
    cabImage: {
        width: '100%',
        height: 160,
    },
    cabInfo: {
        padding: 16,
    },
    cabName: {
        fontSize: 18,
        color: '#333',
        fontWeight: '600',
        marginBottom: 4,
    },
    cabMeta: {
        fontSize: 13,
        color: '#666',
        marginBottom: 12,
    },
    cabSpecs: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 12,
    },
    specItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(1,123,249,0.1)',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 12,
        gap: 4,
    },
    specText: {
        fontSize: 12,
        color: '#017bf9',
        fontWeight: '500',
    },
    driverSection: {
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
    },
    driverHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        gap: 6,
    },
    driverHeaderText: {
        fontSize: 13,
        color: '#666',
        fontWeight: '500',
    },
    driverInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f8f9fa',
        padding: 12,
        borderRadius: 12,
    },
    driverAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#ff5e7a',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    driverAvatarText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 14,
    },
    driverDetails: {
        flex: 1,
    },
    driverName: {
        fontWeight: '600',
        color: '#333',
        fontSize: 14,
    },
    driverId: {
        fontSize: 12,
        color: '#666',
        marginTop: 2,
    },
    changeDriverBtn: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: '#017bf9',
        borderRadius: 8,
    },
    changeDriverText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
    selectDriverBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f8f9fa',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e0e0e0',
        borderStyle: 'dashed',
        gap: 8,
    },
    selectDriverText: {
        color: '#017bf9',
        fontSize: 14,
        fontWeight: '500',
    },
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#fff',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 8,
    },
    bottomBarInfo: {
        flex: 1,
    },
    bottomBarCount: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
    },
    bottomBarSubtext: {
        fontSize: 12,
        color: '#666',
        marginTop: 2,
    },
    proceedBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#00d285',
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 12,
        gap: 8,
    },
    proceedBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '80%',
        paddingTop: 20,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#333',
    },
    driverList: {
        padding: 20,
    },
    driverItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#f8f9fa',
        borderRadius: 12,
        marginBottom: 12,
    },
    emptyState: {
        alignItems: 'center',
        padding: 40,
    },
    emptyText: {
        fontSize: 16,
        color: '#666',
        marginTop: 12,
    },
    backIcon: {
        flexDirection: 'row',
        alignItems: 'center',
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

export default AvailableCabsScreen;