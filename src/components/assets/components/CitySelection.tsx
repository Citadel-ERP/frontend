import React, { useState } from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface CitySelectionProps {
  onCitySelect: (city: string) => void;
  onBack: () => void;
  isDark?: boolean;
}

export interface CityConfig {
  value: string;
  label: string;
  image: any;
}

export const ASSET_CITIES: CityConfig[] = [
  { value: 'Bangalore', label: 'Bangalore', image: require('../../../assets/bangalore.png') },
  { value: 'Chennai', label: 'Chennai', image: require('../../../assets/chennai.png') },
  { value: 'Delhi', label: 'Delhi', image: require('../../../assets/delhi.png') },
  { value: 'Gurgaon', label: 'Gurgaon', image: require('../../../assets/gurgaon.png') },
  { value: 'Hyderabad', label: 'Hyderabad', image: require('../../../assets/hyderabad.png') },
  { value: 'Mumbai', label: 'Mumbai', image: require('../../../assets/mumbai.png') },
  { value: 'Noida', label: 'Noida', image: require('../../../assets/noida.png') },
  { value: 'Pune', label: 'Pune', image: require('../../../assets/pune.png') },
];

export const AssetCitySelection: React.FC<CitySelectionProps> = ({
  onCitySelect,
  onBack,
  isDark = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const insets = useSafeAreaInsets();

  const filteredCities = ASSET_CITIES.filter(city =>
    city.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={[styles.screenContainer, isDark && styles.screenContainerDark]}>
      <StatusBar barStyle="light-content" backgroundColor="#008069" />

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Banner */}
        <LinearGradient
          colors={['#008069', '#00a884']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.headerBanner, { height: 180 + insets.top }]} 
        >
          <Image
            source={require('../../../../assets/cars.jpeg')}
            style={styles.headerImage}
            resizeMode="cover"
          />

          <View style={styles.headerOverlay} />

          <View style={styles.headerContent}>
            <View style={styles.headerTopRow}>
              <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
                <Ionicons name="chevron-back" size={24} color="#fff" />
                <Text style={styles.backText}>Back</Text>
              </TouchableOpacity>
              <Text style={styles.logoText}>CITADEL</Text>
              <View style={{ width: 72 }} />
            </View>
          </View>

          <View style={styles.titleSection}>
            <Text style={styles.sectionTitle}>Select City</Text>
            <Text style={styles.sectionSubtitle}>
              View and manage assets for the selected city
            </Text>
          </View>
        </LinearGradient>

        {/* Search Box */}
        <View style={[styles.searchBox, isDark && styles.searchBoxDark]}>
          <View style={[styles.searchInputWrapper, isDark && styles.searchInputWrapperDark]}>
            <Ionicons name="search" size={20} color="#008069" style={styles.searchIcon} />
            <TextInput
              style={[styles.searchInput, isDark && styles.searchInputDark]}
              placeholder="Search city..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor={isDark ? '#666' : '#999'}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color="#008069" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Cities Grid */}
        <View style={styles.citiesGrid}>
          {filteredCities.length === 0 ? (
            <View style={styles.noCitiesContainer}>
              <Ionicons name="location-outline" size={48} color="#008069" />
              <Text style={[styles.noCitiesText, isDark && styles.noCitiesTextDark]}>
                No cities found
              </Text>
            </View>
          ) : (
            filteredCities.map((city, index) => (
              <TouchableOpacity
                key={city.value}
                style={[styles.cityCard, isDark && styles.cityCardDark]}
                onPress={() => onCitySelect(city.value)}
                activeOpacity={0.7}
              >
                <View style={[styles.cityIconContainer, isDark && styles.cityIconContainerDark]}>
                  <Image
                    source={city.image}
                    style={styles.cityIconImage}
                    resizeMode="contain"
                  />
                </View>
                <Text style={[styles.cityName, isDark && styles.cityNameDark]}>
                  {city.label}
                </Text>
              </TouchableOpacity>
            ))
          )}
        </View>

        <View style={{ height: insets.bottom + 24 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#ece5dd',
  },
  screenContainerDark: {
    backgroundColor: '#050b18',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  headerBanner: {
    height: 260 ,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
    // position: 'relative',
  },
  headerImage: {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,   
  bottom: 0, 
  width: '100%',
  height: '100%',
  opacity: 0.5,
},
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  headerContent: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS == 'ios' ? 60 : 40,
    paddingBottom: 0,
    position: 'relative',
    zIndex: 1,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    gap: 4,
  },
  backText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  logoText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  titleSection: {
    paddingHorizontal: 20,
    paddingVertical: 28,
    position: 'relative',
    zIndex: 1,
    marginTop:20
  },
  sectionTitle: {
    fontSize: 30,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 6,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 20,
  },
  searchBox: {
    padding: 20,
    paddingBottom: 12,
    backgroundColor: '#ece5dd',
  },
  searchBoxDark: {
    backgroundColor: '#050b18',
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    gap: 8,
  },
  searchInputWrapperDark: {
    backgroundColor: '#111a2d',
    borderColor: '#1e2a3a',
  },
  searchIcon: {},
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    padding: 0,
  },
  searchInputDark: {
    color: '#fff',
  },
  citiesGrid: {
    paddingHorizontal: 20,
    paddingTop: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',  
    gap: 12, 
  },
  cityCard: {
    width: '30%',
    alignItems: 'center',
    marginBottom: 28,
  },
  cityCardDark: {},
  cityIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  cityIconContainerDark: {
    backgroundColor: '#111a2d',
  },
  cityIconImage: {
    width: 72,
    height: 72,
  },
  cityName: {
    fontSize: 13,
    color: '#333',
    fontWeight: '600',
    textAlign: 'center',
  },
  cityNameDark: {
    color: '#ffffff',
  },
  noCitiesContainer: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  noCitiesText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  noCitiesTextDark: {
    color: '#a0a0a0',
  },
});

export default AssetCitySelection;