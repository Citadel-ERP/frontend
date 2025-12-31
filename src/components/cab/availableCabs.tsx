import React from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView, Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Vehicle } from './types';
import { getStatusColor } from './utils';
import { colors } from '../../styles/theme';

interface AvailableCabsScreenProps {
    vehicles: Vehicle[];
    onBack: () => void;
    onSelectVehicle: (vehicle: Vehicle) => void;
}

const BackIcon = () => (
    <View style={styles.backIcon}>
        <View style={styles.backArrow} /><Text style={styles.backText}>Back</Text>
    </View>
);

const AvailableCabsScreen: React.FC<AvailableCabsScreenProps> = ({
    vehicles,
    onBack,
    onSelectVehicle
}) => {
    return (
        <View style={styles.screenContainer}>
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
                            <Text style={styles.headerTitle}>Available Cars</Text>
                        </View>
                </LinearGradient>
            </View>

            <ScrollView 
                style={styles.cabsList} 
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {vehicles.map((vehicle) => (
                    <TouchableOpacity
                        key={vehicle.id}
                        style={styles.cabCard}
                        onPress={() => vehicle.status === 'Available' && onSelectVehicle(vehicle)}
                        disabled={vehicle.status !== 'Available'}
                    >
                        <Image
                            source={{ uri: `https://images.unsplash.com/photo-1553440569-bcc63803a83d?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80` }}
                            style={styles.cabImage}
                            defaultSource={require('../../assets/car-placeholder.jpeg')}
                        />

                        <View style={styles.cabInfo}>
                            <View style={styles.cabDetails}>
                                <Text style={styles.cabName}>{vehicle.make} {vehicle.model}</Text>
                                <Text style={styles.cabMeta}>
                                    {vehicle.license_plate} • {vehicle.vehicle_type} • {vehicle.color}
                                </Text>
                                <Text style={styles.cabMeta}>
                                    {vehicle.fuel_type} • {vehicle.year} • {vehicle.seating_capacity} Seater
                                </Text>

                                <View style={styles.cabSpecs}>
                                    <View style={styles.specItem}>
                                        <Text style={styles.specText}>{vehicle.fuel_type}</Text>
                                    </View>
                                    <View style={styles.specItem}>
                                        <Text style={styles.specText}>{vehicle.year}</Text>
                                    </View>
                                    <View style={styles.specItem}>
                                        <Text style={styles.specText}>{vehicle.seating_capacity} Seater</Text>
                                    </View>
                                </View>

                                <View style={styles.driverInfo}>
                                    <View style={styles.driverAvatar}>
                                        <Text style={styles.driverAvatarText}>
                                            {vehicle.assigned_to.full_name.split(' ').map(n => n[0]).join('')}
                                        </Text>
                                    </View>
                                    <View style={styles.driverDetails}>
                                        <Text style={styles.driverName}>{vehicle.assigned_to.full_name}</Text>
                                        <Text style={styles.driverId}>Employee ID: {vehicle.assigned_to.employee_id}</Text>
                                    </View>
                                </View>

                                <Text style={styles.locationText}>
                                    <Text style={{ fontWeight: '600' }}>Current Location:</Text> {vehicle.current_location.city}, {vehicle.current_location.state}
                                </Text>
                            </View>

                            <View style={styles.cabActions}>
                                <TouchableOpacity
                                    style={[styles.selectBtn, vehicle.status !== 'available' && styles.disabledBtn]}
                                    disabled={vehicle.status !== 'available'}
                                    onPress={() => onSelectVehicle(vehicle)}
                                >
                                    <Text style={styles.selectBtnText}>
                                        {vehicle.status === 'available' ? 'Select' : 'Unavailable'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    screenContainer: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    header: {
        height: 180,
        position: 'relative',
        overflow: 'hidden',
    },
    headerBanner: {
        height: 250,
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
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
    },
    headerContent: {
        flex: 1,
        paddingHorizontal: 20,
        paddingVertical: 40,
        position: 'relative',
        zIndex: 1,
    },
    headerTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '600',
        color: '#fff',
    },
    cabsList: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 100,
    },
    cabCard: {
        backgroundColor: '#fff',
        borderRadius: 15,
        padding: 15,
        marginBottom: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 15,
        elevation: 2,
    },
    cabImage: {
        width: '100%',
        height: 180,
        borderRadius: 12,
        marginBottom: 15,
    },
    cabInfo: {
        flexDirection: 'column',
    },
    cabDetails: {
        flex: 1,
    },
    cabName: {
        fontSize: 18,
        color: '#333',
        fontWeight: '600',
        marginBottom: 5,
    },
    cabMeta: {
        fontSize: 13,
        color: '#666',
        marginBottom: 8,
    },
    cabSpecs: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginTop: 10,
        marginBottom: 10,
    },
    specItem: {
        backgroundColor: 'rgba(1,123,249,0.1)',
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 15,
    },
    specText: {
        fontSize: 12,
        color: '#017bf9',
    },
    driverInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 10,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#e0e0e0',
        width: '100%',
    },
    driverAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#ff5e7a',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    driverAvatarText: {
        color: '#fff',
        fontWeight: '600',
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
    locationText: {
        fontSize: 13,
        color: '#666',
        marginTop: 10,
    },
    cabActions: {
        alignItems: 'center',
        marginTop: 15,
    },
    selectBtn: {
        backgroundColor: '#00d285',
        paddingHorizontal: 30,
        paddingVertical: 12,
        borderRadius: 8,
        width: '100%',
        alignItems: 'center',
    },
    selectBtnText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 14,
    },
    disabledBtn: {
        backgroundColor: '#ccc',
        opacity: 0.7,
    },
    logoText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '800',
        letterSpacing: 1,
        textAlign: 'center',
    },
    titleSection: {
        paddingHorizontal: 20,
        paddingVertical: 25,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
    },
    backIcon: {
        height: 24,
        alignItems: 'center',
        justifyContent: 'center',
        display: 'flex',
        flexDirection: 'row',
        alignContent: 'center'
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