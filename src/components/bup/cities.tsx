import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Platform,
  StatusBar,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemeColors } from './types';

interface CitiesProps {
  onCitySelect: (city: string) => void;
  onBack: () => void;
  searchQuery?: string;
  setSearchQuery?: (query: string) => void;
  theme: ThemeColors;
}

// City configuration matching CAB exactly
const CITIES = [
  { value: 'Mumbai', label: 'Mumbai', image: require('../../assets/mumbai.png') },
  { value: 'Delhi', label: 'Delhi', image: require('../../assets/delhi.png') },
  { value: 'Bangalore', label: 'Bangalore', image: require('../../assets/bangalore.png') },
  { value: 'Chennai', label: 'Chennai', image: require('../../assets/chennai.png') },
  // { value: 'Kolkata', label: 'Kolkata', image: require('../../assets/kolkata.png') },
  { value: 'Hyderabad', label: 'Hyderabad', image: require('../../assets/hyderabad.png') },
  { value: 'Pune', label: 'Pune', image: require('../../assets/pune.png') },
  { value: 'Gurgaon', label: 'Gurgaon', image: require('../../assets/gurgaon.png') },
  { value: 'Noida', label: 'Noida', image: require('../../assets/noida.png') },
  // { value: 'Jaipur', label: 'Jaipur', image: require('../../assets/jaipur.png') },
];

const BackIcon = () => (
  <View style={styles.backIcon}>
    <View style={styles.backArrow} />
    <Text style={styles.backText}>Back</Text>
  </View>
);

const Cities: React.FC<CitiesProps> = ({ 
  onCitySelect, 
  onBack, 
  searchQuery = '',
  setSearchQuery,
  theme 
}) => {
  // Filter cities based on search query
  const filteredCities = CITIES.filter(city =>
    city.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.screenContainer}>
      <StatusBar barStyle="light-content" backgroundColor="#017bf9" />
      
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Banner */}
        <View style={[styles.header, styles.headerBanner]}>
          <LinearGradient
            colors={['#4A5568', '#2D3748']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerBanner}
          >
            {/* Background Image */}
            <Image
              source={require('../../assets/bdt.jpg')}
              style={styles.headerImage}
              resizeMode="cover"
            />
            
            {/* Dark overlay for better text visibility */}
            <View style={styles.headerOverlay} />
            
            {/* Header Content */}
            <View style={[styles.headerContent, { 
              paddingTop: Platform.OS === 'ios' ? 50 : 40 
            }]}>
              {/* Top row with back button and logo */}
              <View style={styles.headerTopRow}>
                <TouchableOpacity style={styles.backButton} onPress={onBack}>
                  <BackIcon />
                </TouchableOpacity>
                <Text style={styles.logoText}>CITADEL</Text>
                <View style={[{ marginRight: 36 }]} />
              </View>
            </View>
            
            {/* Title Section */}
            <View style={styles.titleSection}>
              <Text style={styles.sectionTitle}>Select Your City</Text>
            </View>
          </LinearGradient>
        </View>

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
              onPress={() => onCitySelect(city.value)}
              activeOpacity={0.7}
            >
              <View style={styles.cityIconContainer}>
                <Image
                  source={city.image}
                  style={styles.cityIconImage}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.cityName}>{city.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#e7e6e5',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
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
  backButton: {
    padding: 8,
  },
  backIcon: {
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    display: 'flex',
    flexDirection: 'row',
    alignContent: 'center',
  },
  backArrow: {
    width: 12,
    height: 12,
    borderLeftWidth: 2,
    borderTopWidth: 2,
    borderColor: '#fff',
    transform: [{ rotate: '-45deg' }],
  },
  backText: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 2,
  },
  logoText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1,
    textAlign: 'center',
    marginRight: 25,
  },
  titleSection: {
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
    backgroundColor: '#e7e6e5',
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
    width: '30%',
    alignItems: 'center',
    marginBottom: 25,
  },
  cityIconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cityIconImage: {
    width: 80,
    height: 80,
    borderRadius: 50,
  },
  cityName: {
    fontSize: 13,
    color: '#333',
    fontWeight: '600',
    textAlign: 'center',
  },
  bottomSpacing: {
    height: 40,
  },
});

export default Cities;