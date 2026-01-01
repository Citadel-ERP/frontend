import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { ThemeColors } from './types';

const { width: screenWidth } = Dimensions.get('window');

interface CitiesProps {
  onCitySelect: (city: string) => void;
  onBack: () => void;
  theme: ThemeColors;
}

const CITIES = [
  { value: 'Hyderabad', label: 'Hyderabad', icon: '🏙️' },
  { value: 'Bangalore', label: 'Bangalore', icon: '🌆' },
  { value: 'Delhi', label: 'Delhi', icon: '🏛️' },
  { value: 'Gurgaon', label: 'Gurgaon', icon: '🏢' },
  { value: 'Noida', label: 'Noida', icon: '🏘️' }
];

const Cities: React.FC<CitiesProps> = ({ onCitySelect, onBack, theme }) => {
  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: theme.background }]} 
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.text }]}>Select City</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Choose a city to manage leads
        </Text>
        
        <View style={styles.citiesGrid}>
          {CITIES.map((city) => (
            <TouchableOpacity
              key={city.value}
              style={[styles.cityCard, { backgroundColor: theme.cardBg }]}
              onPress={() => onCitySelect(city.value)}
            >
              <Text style={styles.cityIcon}>{city.icon}</Text>
              <Text style={[styles.cityName, { color: theme.text }]}>{city.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingTop: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 40,
  },
  citiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 15,
  },
  cityCard: {
    width: (screenWidth - 40 - 15) / 2,
    padding: 25,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 15,
    borderWidth: 1,
  },
  cityIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  cityName: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default Cities;