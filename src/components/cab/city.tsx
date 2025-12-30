import React from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { City } from './types';

interface CityScreenProps {
    onBack: () => void;
    onCitySelect: (cityName: string) => void;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    filteredCities: City[];
}

const CityScreen: React.FC<CityScreenProps> = ({
    onBack,
    onCitySelect,
    searchQuery,
    setSearchQuery,
    filteredCities
}) => {
    return (
        <View style={styles.screenContainer}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Select Your City</Text>
                <TouchableOpacity style={styles.closeBtn} onPress={onBack}>
                    <Ionicons name="close" size={24} color="#fff" />
                </TouchableOpacity>
            </View>

            <View style={styles.searchBox}>
                <View style={styles.searchInputWrapper}>
                    <Ionicons name="search" size={20} color="#017bf9" style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search for your city"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholderTextColor="#666"
                    />
                </View>
            </View>

            <View style={styles.divider}>
                <Text style={styles.dividerText}>Popular Cities</Text>
            </View>

            <ScrollView
                style={styles.citiesGridScroll}
                contentContainerStyle={styles.citiesGridContent}
                showsVerticalScrollIndicator={false}
            >
                {filteredCities.map((city, index) => (
                    <TouchableOpacity
                        key={index}
                        style={styles.cityCard}
                        onPress={() => onCitySelect(city.name)}
                    >
                        <View style={styles.cityIcon}>
                            <Text style={styles.cityIconText}>{city.icon}</Text>
                        </View>
                        <Text style={styles.cityName}>{city.name}</Text>
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
    headerTitle: {
        fontSize: 24,
        fontWeight: '600',
        color: '#fff',
    },
    closeBtn: {
        position: 'absolute',
        right: 20,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    searchBox: {
        padding: 20,
    },
    searchInputWrapper: {
        position: 'relative',
        flexDirection: 'row',
        alignItems: 'center',
    },
    searchInput: {
        backgroundColor: '#fff',
        borderWidth: 2,
        borderColor: '#e0e0e0',
        borderRadius: 25,
        paddingHorizontal: 45,
        paddingVertical: 15,
        fontSize: 16,
        flex: 1,
    },
    searchIcon: {
        position: 'absolute',
        left: 20,
        zIndex: 1,
    },
    divider: {
        alignItems: 'center',
        marginVertical: 20,
    },
    dividerText: {
        fontSize: 16,
        fontWeight: '500',
        color: '#666',
    },
    citiesGridScroll: {
        flex: 1,
    },
    citiesGridContent: {
        padding: 20,
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    cityCard: {
        backgroundColor: '#fff',
        borderRadius: 15,
        padding: 15,
        width: '48%',
        alignItems: 'center',
        marginBottom: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
        elevation: 2,
    },
    cityIcon: {
        width: 50,
        height: 50,
        borderRadius: 12,
        backgroundColor: '#017bf9',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
    },
    cityIconText: {
        fontSize: 24,
    },
    cityName: {
        fontSize: 13,
        color: '#333',
        fontWeight: '500',
        textAlign: 'center',
    },
});

export default CityScreen;