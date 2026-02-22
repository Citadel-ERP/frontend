// availableCabs.tsx
import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView, Image,
    Modal, Alert, useWindowDimensions, Platform
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Vehicle, Driver, AvailableCabsScreenProps } from './types';
import { colors } from '../../styles/theme';

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
    const { width } = useWindowDimensions();
    const isWeb = Platform.OS === 'web';
    const isLargeScreen = width >= 1024;
    const isTablet = width >= 768;

    const responsiveStyle = (mobile: any, tablet: any, desktop: any) => {
        if (isLargeScreen) return desktop;
        if (isTablet) return tablet;
        return mobile;
    };

    const isVehicleSelected = (vehicleId: number) =>
        selectedVehicles.some(sv => sv.vehicle.id === vehicleId);

    const getAssignedDriver = (vehicleId: number) => {
        const selected = selectedVehicles.find(sv => sv.vehicle.id === vehicleId);
        return selected?.driver || null;
    };

    const handleSelectVehicle = (vehicle: Vehicle) => {
        if (isVehicleSelected(vehicle.id)) {
            onUpdateSelection(selectedVehicles.filter(sv => sv.vehicle.id !== vehicle.id));
        } else {
            const usedDriverEmployeeIds = selectedVehicles
                .map(sv => sv.driver?.employee_id)
                .filter(Boolean) as string[];

            const freeDrivers = availableDrivers.filter(
                d => !usedDriverEmployeeIds.includes(d.employee_id)
            );

            const autoDriver = freeDrivers[0] || null;
            onUpdateSelection([...selectedVehicles, { vehicle, driver: autoDriver }]);
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
            updated[currentVehicleIndex] = { ...updated[currentVehicleIndex], driver };
            onUpdateSelection(updated);
        }
        setDriverModalVisible(false);
        setCurrentVehicleIndex(null);
    };

    const handleRemoveDriver = () => {
        if (currentVehicleIndex !== null) {
            const updated = [...selectedVehicles];
            updated[currentVehicleIndex] = { ...updated[currentVehicleIndex], driver: null };
            onUpdateSelection(updated);
        }
        setDriverModalVisible(false);
        setCurrentVehicleIndex(null);
    };

    const getAvailableDriversForSelection = () => {
        const usedDriverEmployeeIds = selectedVehicles
            .filter((_, idx) => idx !== currentVehicleIndex)
            .map(sv => sv.driver?.employee_id)
            .filter(Boolean) as string[];
        return availableDrivers.filter(d => !usedDriverEmployeeIds.includes(d.employee_id));
    };

    return (
        <View style={[styles.screenContainer, isWeb && styles.screenContainerWeb]}>
            <ScrollView
                style={[styles.scrollContainer, { marginTop: Platform.OS === 'ios' ? -60 : 0 }]}
                contentContainerStyle={[styles.scrollContent, isWeb && styles.scrollContentWeb]}
                showsVerticalScrollIndicator={isWeb}
            >
                {/* Header Banner */}
                <View style={[styles.header, styles.headerBanner,
                    responsiveStyle(styles.headerBanner, styles.headerBannerTablet, styles.headerBannerDesktop)
                ]}>
                    <LinearGradient
                        colors={['#4A5568', '#2D3748']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={[styles.headerBanner,
                            responsiveStyle(styles.headerBanner, styles.headerBannerTablet, styles.headerBannerDesktop)
                        ]}
                    >
                        <Image
                            source={require('../../assets/cars.jpeg')}
                            style={[styles.headerImage, isLargeScreen && styles.headerImageDesktop]}
                            resizeMode="cover"
                        />
                        <View style={styles.headerOverlay} />
                        <View style={[styles.headerContentContainer, isWeb && styles.headerContentContainerWeb]}>
                            <View style={[styles.headerContent, { paddingTop: Platform.OS === 'ios' ? 60 : 40, marginRight: 15 }]}>
                                <View style={styles.headerTopRow}>
                                    <TouchableOpacity style={styles.backButton} onPress={onBack}>
                                        <BackIcon />
                                    </TouchableOpacity>
                                    <Text style={[styles.logoText, isLargeScreen && styles.logoTextDesktop]}>CITADEL</Text>
                                    <View style={{ width: 40 }} />
                                </View>
                            </View>
                            <View style={[styles.titleSection, isLargeScreen && styles.titleSectionDesktop, { marginTop: 45 }]}>
                                <Text style={[styles.headerTitle,
                                    responsiveStyle(styles.headerTitle, styles.headerTitleTablet, styles.headerTitleDesktop)
                                ]}>
                                    Fleet
                                </Text>
                                <Text style={[styles.headerSubtitle,
                                    responsiveStyle(styles.headerSubtitle, styles.headerSubtitleTablet, styles.headerSubtitleDesktop)
                                ]}>
                                    {vehicles.length > 0
                                        ? `${selectedVehicles.length} of ${vehicles.length} selected`
                                        : 'No vehicles in your city'
                                    }
                                </Text>
                            </View>
                        </View>
                    </LinearGradient>
                </View>

                {/* Instruction Banner */}
                {vehicles.length > 0 && (
                    <View style={[styles.instructionBanner, isWeb && styles.instructionBannerWeb]}>
                        <View style={[styles.instructionBannerInner, isWeb && styles.instructionBannerInnerWeb]}>
                            <MaterialCommunityIcons name="information-outline" size={18} color="#017bf9" />
                            <Text style={styles.instructionText}>
                                Select your vehicle(s) and driver, then tap Continue to set trip details and time
                            </Text>
                        </View>
                    </View>
                )}

                {/* Main Content Container */}
                <View style={[styles.mainContentContainer, isWeb && styles.mainContentContainerWeb]}>
                    <View style={[styles.cabsListContent, isLargeScreen && styles.cabsListContentDesktop]}>
                        {vehicles.length === 0 ? (
                            <View style={[styles.emptyStateContainer, isLargeScreen && styles.emptyStateContainerDesktop]}>
                                <View style={[styles.emptyStateCard,
                                    responsiveStyle(styles.emptyStateCard, styles.emptyStateCardTablet, styles.emptyStateCardDesktop)
                                ]}>
                                    <View style={styles.emptyIconContainer}>
                                        <MaterialCommunityIcons name="car-off" size={responsiveStyle(64, 72, 80)} color="#CBD5E0" />
                                    </View>
                                    <Text style={[styles.emptyStateTitle,
                                        responsiveStyle(styles.emptyStateTitle, styles.emptyStateTitleTablet, styles.emptyStateTitleDesktop)
                                    ]}>
                                        No Vehicles Found
                                    </Text>
                                    <Text style={[styles.emptyStateMessage,
                                        responsiveStyle(styles.emptyStateMessage, styles.emptyStateMessageTablet, styles.emptyStateMessageDesktop)
                                    ]}>
                                        There are no vehicles registered in your city yet.
                                    </Text>
                                    <TouchableOpacity style={styles.tryAgainButton} onPress={onBack}>
                                        <MaterialCommunityIcons name="arrow-left" size={20} color="#008069" />
                                        <Text style={styles.tryAgainText}>Go Back</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ) : (
                            <View style={[styles.vehiclesGrid, isLargeScreen && styles.vehiclesGridDesktop]}>
                                {vehicles.map((vehicle) => {
                                    const isSelected = isVehicleSelected(vehicle.id);
                                    const assignedDriver = getAssignedDriver(vehicle.id);
                                    return (
                                        <TouchableOpacity
                                            key={vehicle.id}
                                            style={[
                                                styles.cabCard,
                                                responsiveStyle(styles.cabCard, styles.cabCardTablet, styles.cabCardDesktop),
                                                isSelected && styles.cabCardSelected
                                            ]}
                                            onPress={() => handleSelectVehicle(vehicle)}
                                            activeOpacity={0.7}
                                        >
                                            {isSelected && (
                                                <View style={styles.selectedBadge}>
                                                    <MaterialCommunityIcons name="check-circle" size={24} color="#00d285" />
                                                </View>
                                            )}

                                            <Image
                                                source={{
                                                    uri: vehicle.vehicle_photos && vehicle.vehicle_photos.length > 0
                                                        ? vehicle.vehicle_photos[0].photo
                                                        : 'https://images.unsplash.com/photo-1553440569-bcc63803a83d?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80'
                                                }}
                                                style={[styles.cabImage,
                                                    responsiveStyle(styles.cabImage, styles.cabImageTablet, styles.cabImageDesktop)
                                                ]}
                                                resizeMode="contain"
                                            />

                                            <View style={styles.cabInfo}>
                                                <Text style={[styles.cabName,
                                                    responsiveStyle(styles.cabName, styles.cabNameTablet, styles.cabNameDesktop)
                                                ]}>
                                                    {vehicle.make} {vehicle.model}
                                                </Text>
                                                <Text style={[styles.cabMeta,
                                                    responsiveStyle(styles.cabMeta, styles.cabMetaTablet, styles.cabMetaDesktop)
                                                ]}>
                                                    {vehicle.license_plate} • {vehicle.color} • {vehicle.year}
                                                </Text>
                                                <View style={[styles.cabSpecs,
                                                    responsiveStyle(styles.cabSpecs, styles.cabSpecsTablet, styles.cabSpecsDesktop)
                                                ]}>
                                                    <View style={styles.specItem}>
                                                        <MaterialCommunityIcons name="gas-station" size={14} color="#008069" />
                                                        <Text style={styles.specText}>{vehicle.fuel_type}</Text>
                                                    </View>
                                                    <View style={styles.specItem}>
                                                        <MaterialCommunityIcons name="seat-passenger" size={14} color="#008069" />
                                                        <Text style={styles.specText}>{vehicle.seating_capacity} Seats</Text>
                                                    </View>
                                                </View>

                                                {isSelected && (
                                                    <View style={[styles.driverSection,
                                                        responsiveStyle(styles.driverSection, styles.driverSectionTablet, styles.driverSectionDesktop)
                                                    ]}>
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
                                                                <MaterialCommunityIcons name="plus-circle" size={20} color="#008069" />
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
                        )}
                    </View>
                </View>
            </ScrollView>

            {/* Bottom Continue Bar */}
            {selectedVehicles.length > 0 && (
                <View style={[styles.bottomBar, isWeb && styles.bottomBarWeb, { marginBottom: Platform.OS === 'ios' ? -30 : 0 }]}>
                    <View style={[styles.bottomBarContainer, isWeb && styles.bottomBarContainerWeb]}>
                        <View style={styles.bottomBarInfo}>
                            <Text style={[styles.bottomBarCount,
                                responsiveStyle(styles.bottomBarCount, styles.bottomBarCountTablet, styles.bottomBarCountDesktop)
                            ]}>
                                {selectedVehicles.length} Vehicle{selectedVehicles.length !== 1 ? 's' : ''} Selected
                            </Text>
                            <Text style={[styles.bottomBarSubtext,
                                responsiveStyle(styles.bottomBarSubtext, styles.bottomBarSubtextTablet, styles.bottomBarSubtextDesktop)
                            ]}>
                                {selectedVehicles.filter(sv => sv.driver).length} driver{selectedVehicles.filter(sv => sv.driver).length !== 1 ? 's' : ''} assigned
                            </Text>
                        </View>
                        <TouchableOpacity
                            style={[styles.proceedBtn,
                                responsiveStyle(styles.proceedBtn, styles.proceedBtnTablet, styles.proceedBtnDesktop),
                                { marginTop: 10 }
                            ]}
                            onPress={onProceedToBooking}
                        >
                            <Text style={styles.proceedBtnText}>Continue</Text>
                            <MaterialCommunityIcons name="arrow-right" size={20} color="#fff" />
                        </TouchableOpacity>
                    </View>
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
                    <View style={[styles.modalContent,
                        responsiveStyle(styles.modalContent, styles.modalContentTablet, styles.modalContentDesktop)
                    ]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle,
                                responsiveStyle(styles.modalTitle, styles.modalTitleTablet, styles.modalTitleDesktop)
                            ]}>
                                Select Driver
                            </Text>
                            <TouchableOpacity onPress={() => setDriverModalVisible(false)}>
                                <MaterialCommunityIcons name="close" size={24} color="#333" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.driverList}>
                            {/* No Driver Option */}
                            <TouchableOpacity
                                style={[styles.driverItem, styles.noDriverItem,
                                    responsiveStyle(styles.driverItem, styles.driverItemTablet, styles.driverItemDesktop)
                                ]}
                                onPress={handleRemoveDriver}
                            >
                                <View style={[styles.driverAvatar, { backgroundColor: '#e0e0e0' }]}>
                                    <MaterialCommunityIcons name="account-off" size={20} color="#999" />
                                </View>
                                <View style={styles.driverDetails}>
                                    <Text style={[styles.driverName,
                                        responsiveStyle(styles.driverName, styles.driverNameTablet, styles.driverNameDesktop)
                                    ]}>
                                        No Driver (Assign Later)
                                    </Text>
                                    <Text style={[styles.driverId,
                                        responsiveStyle(styles.driverId, styles.driverIdTablet, styles.driverIdDesktop)
                                    ]}>
                                        Driver will be assigned by manager
                                    </Text>
                                </View>
                                <MaterialCommunityIcons name="chevron-right" size={24} color="#ccc" />
                            </TouchableOpacity>

                            {getAvailableDriversForSelection().map((driver, index) => (
                                <TouchableOpacity
                                    key={`driver-${driver.employee_id}-${index}`}
                                    style={[styles.driverItem,
                                        responsiveStyle(styles.driverItem, styles.driverItemTablet, styles.driverItemDesktop)
                                    ]}
                                    onPress={() => handleSelectDriver(driver)}
                                >
                                    <View style={styles.driverAvatar}>
                                        <Text style={styles.driverAvatarText}>
                                            {driver.full_name.split(' ').map(n => n[0]).join('')}
                                        </Text>
                                    </View>
                                    <View style={styles.driverDetails}>
                                        <Text style={[styles.driverName,
                                            responsiveStyle(styles.driverName, styles.driverNameTablet, styles.driverNameDesktop)
                                        ]}>
                                            {driver.full_name}
                                        </Text>
                                        <Text style={[styles.driverId,
                                            responsiveStyle(styles.driverId, styles.driverIdTablet, styles.driverIdDesktop)
                                        ]}>
                                            {driver.employee_id} • {driver.email}
                                        </Text>
                                    </View>
                                    <MaterialCommunityIcons name="chevron-right" size={24} color="#ccc" />
                                </TouchableOpacity>
                            ))}

                            {getAvailableDriversForSelection().length === 0 && (
                                <View style={styles.emptyState}>
                                    <MaterialCommunityIcons name="account-off" size={48} color="#ccc" />
                                    <Text style={styles.emptyText}>No other drivers available</Text>
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
    screenContainer: { flex: 1, backgroundColor: '#e7e6e5' },
    screenContainerWeb: { alignItems: 'center' },
    scrollContainer: { flex: 1, width: '100%' },
    scrollContent: { flexGrow: 1, paddingBottom: 100 },
    scrollContentWeb: { maxWidth: 1200, width: '100%', alignSelf: 'center' },

    header: { position: 'relative', overflow: 'hidden' },
    headerBanner: {
        height: 250,
        borderBottomLeftRadius: 30, borderBottomRightRadius: 30,
        overflow: 'hidden', position: 'relative', width: '100%',
    },
    headerBannerTablet: { height: 280 },
    headerBannerDesktop: { height: 320 },
    headerImage: {
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        width: '100%', height: '100%', opacity: 1,
    },
    headerImageDesktop: { height: 320 },
    headerOverlay: {
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
    },
    headerContentContainer: { flex: 1, zIndex: 1 },
    headerContentContainerWeb: { maxWidth: 1200, alignSelf: 'center', width: '100%' },
    headerContent: { paddingHorizontal: 20, paddingVertical: 40 },
    headerTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    logoText: { color: 'white', fontSize: 16, fontWeight: '800', letterSpacing: 1 },
    logoTextDesktop: { fontSize: 20, letterSpacing: 2 },
    titleSection: { paddingHorizontal: 20, paddingBottom: 20 },
    titleSectionDesktop: { paddingHorizontal: 40, paddingBottom: 40 },
    headerTitle: { fontSize: 24, fontWeight: '600', color: '#fff' },
    headerTitleTablet: { fontSize: 28 },
    headerTitleDesktop: { fontSize: 32 },
    headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
    headerSubtitleTablet: { fontSize: 16 },
    headerSubtitleDesktop: { fontSize: 18 },

    // Instruction Banner
    instructionBanner: {
        backgroundColor: 'rgba(1,123,249,0.08)',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(1,123,249,0.15)',
        paddingVertical: 10,
        paddingHorizontal: 16,
    },
    instructionBannerWeb: { alignItems: 'center' },
    instructionBannerInner: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
    },
    instructionBannerInnerWeb: { maxWidth: 1200, width: '100%' },
    instructionText: { fontSize: 13, color: '#017bf9', flex: 1, lineHeight: 18 },

    mainContentContainer: { flex: 1 },
    mainContentContainerWeb: { maxWidth: 1200, width: '100%', alignSelf: 'center' },
    cabsListContent: { padding: 16 },
    cabsListContentDesktop: { padding: 24 },

    vehiclesGrid: {},
    vehiclesGridDesktop: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 16 },

    // Empty State
    emptyStateContainer: {
        flex: 1, alignItems: 'center', justifyContent: 'center',
        paddingVertical: 60, paddingHorizontal: 20,
    },
    emptyStateContainerDesktop: { paddingVertical: 80 },
    emptyStateCard: {
        backgroundColor: '#fff', borderRadius: 20, padding: 32, alignItems: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1, shadowRadius: 12, elevation: 4, width: '100%', maxWidth: 400,
    },
    emptyStateCardTablet: { maxWidth: 500, padding: 40 },
    emptyStateCardDesktop: { maxWidth: 600, padding: 48 },
    emptyIconContainer: {
        width: 120, height: 120, borderRadius: 60, backgroundColor: '#F7FAFC',
        alignItems: 'center', justifyContent: 'center', marginBottom: 24,
    },
    emptyStateTitle: { fontSize: 24, fontWeight: '700', color: '#2D3748', marginBottom: 12, textAlign: 'center' },
    emptyStateTitleTablet: { fontSize: 28 },
    emptyStateTitleDesktop: { fontSize: 32 },
    emptyStateMessage: { fontSize: 16, color: '#4A5568', textAlign: 'center', lineHeight: 24, marginBottom: 28 },
    emptyStateMessageTablet: { fontSize: 18, lineHeight: 28 },
    emptyStateMessageDesktop: { fontSize: 20, lineHeight: 32 },
    tryAgainButton: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#EBF8FF',
        paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12, gap: 8,
        borderWidth: 1, borderColor: '#008069',
    },
    tryAgainText: { color: '#008069', fontSize: 16, fontWeight: '600' },

    // Cab Cards
    cabCard: {
        backgroundColor: '#fff', borderRadius: 16, marginBottom: 16,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08, shadowRadius: 12, elevation: 3,
        overflow: 'hidden', borderWidth: 2, borderColor: 'transparent',
    },
    cabCardTablet: { marginBottom: 20 },
    cabCardDesktop: { width: '48%', marginBottom: 16 },
    cabCardSelected: { borderColor: '#00d285' },
    selectedBadge: {
        position: 'absolute', top: 12, right: 12, zIndex: 1,
        backgroundColor: '#fff', borderRadius: 20, padding: 2,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2, shadowRadius: 4, elevation: 4,
    },
    cabImage: { width: '100%', height: 160 },
    cabImageTablet: { height: 180 },
    cabImageDesktop: { height: 200 },
    cabInfo: { padding: 16 },
    cabName: { fontSize: 18, color: '#333', fontWeight: '600', marginBottom: 4 },
    cabNameTablet: { fontSize: 20 },
    cabNameDesktop: { fontSize: 22 },
    cabMeta: { fontSize: 13, color: '#666', marginBottom: 12 },
    cabMetaTablet: { fontSize: 14 },
    cabMetaDesktop: { fontSize: 15 },
    cabSpecs: { flexDirection: 'row', gap: 12, marginBottom: 12 },
    cabSpecsTablet: { gap: 16 },
    cabSpecsDesktop: { gap: 20 },
    specItem: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(1,123,249,0.1)',
        paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, gap: 4,
    },
    specText: { fontSize: 12, color: '#008069', fontWeight: '500' },

    driverSection: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
    driverSectionTablet: { marginTop: 16, paddingTop: 16 },
    driverSectionDesktop: { marginTop: 20, paddingTop: 20 },
    driverHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 6 },
    driverHeaderText: { fontSize: 13, color: '#666', fontWeight: '500' },
    driverInfo: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8f9fa',
        padding: 12, borderRadius: 12,
    },
    driverAvatar: {
        width: 40, height: 40, borderRadius: 20, backgroundColor: '#ff5e7a',
        alignItems: 'center', justifyContent: 'center', marginRight: 12,
    },
    driverAvatarText: { color: '#fff', fontWeight: '600', fontSize: 14 },
    driverDetails: { flex: 1 },
    driverName: { fontWeight: '600', color: '#333', fontSize: 14 },
    driverNameTablet: { fontSize: 15 },
    driverNameDesktop: { fontSize: 16 },
    driverId: { fontSize: 12, color: '#666', marginTop: 2 },
    driverIdTablet: { fontSize: 13 },
    driverIdDesktop: { fontSize: 14 },
    changeDriverBtn: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#008069', borderRadius: 8 },
    changeDriverText: { color: '#fff', fontSize: 12, fontWeight: '600' },
    selectDriverBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#f8f9fa', padding: 12, borderRadius: 12,
        borderWidth: 1, borderColor: '#e0e0e0', borderStyle: 'dashed', gap: 8,
    },
    selectDriverText: { color: '#008069', fontSize: 14, fontWeight: '500' },

    // Bottom Bar
    bottomBar: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: '#fff',
        shadowColor: '#000', shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1, shadowRadius: 12, elevation: 8,
    },
    bottomBarWeb: { alignItems: 'center' },
    bottomBarContainer: { padding: 16 },
    bottomBarContainerWeb: {
        maxWidth: 1200, width: '100%', flexDirection: 'row',
        justifyContent: 'space-between', alignItems: 'center',
    },
    bottomBarInfo: { flex: 1 },
    bottomBarCount: { fontSize: 18, fontWeight: '600', color: '#333' },
    bottomBarCountTablet: { fontSize: 20 },
    bottomBarCountDesktop: { fontSize: 22 },
    bottomBarSubtext: { fontSize: 12, color: '#666', marginTop: 2 },
    bottomBarSubtextTablet: { fontSize: 13 },
    bottomBarSubtextDesktop: { fontSize: 14 },
    proceedBtn: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#00d285',
        paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12, gap: 8,
    },
    proceedBtnTablet: { paddingHorizontal: 32, paddingVertical: 16 },
    proceedBtnDesktop: { paddingHorizontal: 40, paddingVertical: 18 },
    proceedBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },

    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: Platform.OS === 'web' ? 'center' : 'flex-end',
        alignItems: Platform.OS === 'web' ? 'center' : 'stretch',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 24, borderTopRightRadius: 24,
        maxHeight: '80%', paddingTop: 20,
        ...(Platform.OS === 'web' && { borderRadius: 24 }),
    },
    modalContentTablet: {
        maxHeight: '60%', alignSelf: 'center', width: '80%',
        borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
    },
    modalContentDesktop: {
        maxHeight: '70%', width: 600, borderRadius: 24,
        maxWidth: '90%', alignSelf: 'center', marginHorizontal: 'auto' as any,
    },
    modalHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 20, paddingBottom: 16,
        borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
    },
    modalTitle: { fontSize: 20, fontWeight: '600', color: '#333' },
    modalTitleTablet: { fontSize: 24 },
    modalTitleDesktop: { fontSize: 28 },
    driverList: { padding: 20 },
    driverItem: {
        flexDirection: 'row', alignItems: 'center', padding: 16,
        backgroundColor: '#f8f9fa', borderRadius: 12, marginBottom: 12,
    },
    noDriverItem: { backgroundColor: '#fafafa', borderWidth: 1, borderColor: '#eee', borderStyle: 'dashed' },
    driverItemTablet: { padding: 20 },
    driverItemDesktop: { padding: 24 },
    emptyState: { alignItems: 'center', padding: 40 },
    emptyText: { fontSize: 16, color: '#666', marginTop: 12 },

    backIcon: { flexDirection: 'row', alignItems: 'center' },
    backArrow: {
        width: 12, height: 12, borderLeftWidth: 2, borderTopWidth: 2,
        borderColor: '#fff', transform: [{ rotate: '-45deg' }],
    },
    backButton: { padding: 8 },
    backText: { color: colors.white, fontSize: 16, marginLeft: 2 },
});

export default AvailableCabsScreen;