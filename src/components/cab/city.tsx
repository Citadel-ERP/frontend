import React from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, StatusBar, Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { City } from './types';
import { colors } from '../../styles/theme';

interface CityScreenProps {
    onBack: () => void;
    onCitySelect: (cityName: string) => void;
    onViewBookings: () => void;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    filteredCities: City[];
}

const BackIcon = () => (
    <View style={styles.backIcon}>
        <View style={styles.backArrow} /><Text style={styles.backText}>Back</Text>
    </View>
);

const CityScreen: React.FC<CityScreenProps> = ({
    onBack,
    onCitySelect,
    onViewBookings,
    searchQuery,
    setSearchQuery,
    filteredCities
}) => {
    const insets = useSafeAreaInsets();

    return (
        <View style={styles.screenContainer}>
            <StatusBar barStyle="light-content" backgroundColor="#017bf9" />

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
                        {/* Background Image */}
                        <Image
                            source={require('../../assets/cars.jpeg')}
                            style={[styles.headerImage]}
                            resizeMode="cover"
                        />
                        {/* Dark overlay for better text visibility */}
                        <View style={styles.headerOverlay} />

                        {/* Header Content */}
                        <View style={styles.headerContent}>
                            {/* Top row with Citadel logo and close button */}
                            <View style={styles.headerTopRow}>
                                <TouchableOpacity style={styles.backButton} onPress={onBack}>
                                    <BackIcon />
                                </TouchableOpacity>
                                <Text style={styles.logoText}>CITADEL</Text>
                                <View style={[{ marginRight: 36 }]} />
                            </View>
                        </View>
                        <View style={styles.titleSection}>
                            <Text style={styles.sectionTitle}>Select Your City</Text>
                        </View>
                    </LinearGradient>
                </View>

                {/* Title Section - Blue background with rounded bottom */}


                {/* Search Box */}
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

                {/* Popular Cities Label */}
                <View style={styles.divider}>
                    <Text style={styles.dividerText}>Popular Cities</Text>
                </View>

                {/* Cities Grid */}
                <View style={styles.citiesGrid}>
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
                </View>

                {/* View Previous Bookings Section */}
                <View style={styles.bookingsLinkContainer}>
                    <View style={styles.dividerLine}>
                        <View style={styles.line} />
                        <Text style={styles.orText}>or</Text>
                        <View style={styles.line} />
                    </View>
                    <TouchableOpacity
                        style={styles.bookingsLink}
                        onPress={onViewBookings}
                    >
                        <Text style={styles.bookingsLinkText}>
                            view your previous bookings
                        </Text>
                        <Ionicons name="chevron-forward" size={20} color="#017bf9" />
                    </TouchableOpacity>
                </View>
            </ScrollView>
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
    },
    header: {
        // backgroundColor: '#017bf9',
        height: 180,
        position: 'relative',
        overflow: 'hidden',
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
    logoText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '800',
        letterSpacing: 1,
        textAlign: 'center',
        marginRight: 25,
    },
    closeBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        // backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    titleSection: {
        // backgroundColor: '#017bf9',
        paddingHorizontal: 20,
        paddingVertical: 25,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
    },
    sectionTitle: {
        fontSize: 28,
        fontWeight: '700',
        color: '#fff',
    },
    searchBox: {
        padding: 20,
        backgroundColor: '#f5f5f5',
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
    citiesGrid: {
        paddingHorizontal: 20,
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
    bookingsLinkContainer: {
        paddingHorizontal: 20,
        marginTop: 30,
        marginBottom: 40,
    },
    dividerLine: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    line: {
        flex: 1,
        height: 1,
        backgroundColor: '#d0d0d0',
    },
    orText: {
        marginHorizontal: 15,
        fontSize: 14,
        color: '#999',
        fontWeight: '500',
    },
    bookingsLink: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
        paddingVertical: 18,
        paddingHorizontal: 20,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
        elevation: 2,
    },
    bookingsLinkText: {
        fontSize: 16,
        color: '#017bf9',
        fontWeight: '600',
        marginRight: 8,
    },
    headerBanner: {
        height: 250,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        overflow: 'hidden',
        position: 'relative',
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

export default CityScreen;