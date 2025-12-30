import React from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView, Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Vehicle } from './types';
import { getStatusColor } from './utils';

interface AvailableCabsScreenProps {
    vehicles: Vehicle[];
    onBack: () => void;
    onSelectVehicle: (vehicle: Vehicle) => void;
}

const AvailableCabsScreen: React.FC<AvailableCabsScreenProps> = ({
    vehicles,
    onBack,
    onSelectVehicle
}) => {
    return (
        <View style={styles.screenContainer}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={onBack}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Available Cabs</Text>
            </View>

            <ScrollView style={styles.cabsList}>
                {vehicles.map((vehicle) => (
                    <TouchableOpacity
                        key={vehicle.id}
                        style={styles.cabCard}
                        onPress={() => onSelectVehicle(vehicle)}
                        disabled={vehicle.status !== 'Available'}
                    >
                        <Image
                            source={{ uri: `https://images.unsplash.com/photo-1553440569-bcc63803a83d?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80` }}
                            style={styles.cabImage}
                            defaultSource={require('../assets/car-placeholder.jpeg')}
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
                                    <View>
                                        <Text style={styles.driverName}>{vehicle.assigned_to.full_name}</Text>
                                        <Text style={styles.driverId}>Employee ID: {vehicle.assigned_to.employee_id}</Text>
                                    </View>
                                </View>

                                <Text style={styles.locationText}>
                                    <Text style={{ fontWeight: '600' }}>Current Location:</Text> {vehicle.current_location.city}, {vehicle.current_location.state}
                                </Text>
                            </View>

                            <View style={styles.cabActions}>
                                <View style={[
                                    styles.statusBadge,
                                    { backgroundColor: vehicle.status === 'Available' ? 'rgba(0,210,133,0.1)' : 'rgba(255,181,87,0.1)' }
                                ]}>
                                    <Text style={[
                                        styles.statusText,
                                        { color: getStatusColor(vehicle.status) }
                                    ]}>
                                        {vehicle.status}
                                    </Text>
                                </View>

                                <TouchableOpacity
                                    style={[styles.selectBtn, vehicle.status !== 'Available' && styles.disabledBtn]}
                                    disabled={vehicle.status !== 'Available'}
                                    onPress={() => onSelectVehicle(vehicle)}
                                >
                                    <Text style={styles.selectBtnText}>
                                        {vehicle.status === 'Available' ? 'Select' : 'Unavailable'}
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
    },
    header: {
        backgroundColor: '#017bf9',
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 4,
    },
    backBtn: {
        position: 'absolute',
        left: 20,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
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
        padding: 20,
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
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    cabDetails: {
        flex: 1,
        marginRight: 15,
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
    driverName: {
        fontWeight: '600',
        color: '#333',
    },
    driverId: {
        fontSize: 12,
        color: '#666',
    },
    locationText: {
        fontSize: 13,
        color: '#666',
        marginTop: 10,
    },
    cabActions: {
        alignItems: 'flex-end',
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 20,
        marginBottom: 15,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
    },
    selectBtn: {
        backgroundColor: '#00d285',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
    },
    selectBtnText: {
        color: '#fff',
        fontWeight: '600',
    },
    disabledBtn: {
        opacity: 0.5,
    },
});

export default AvailableCabsScreen;