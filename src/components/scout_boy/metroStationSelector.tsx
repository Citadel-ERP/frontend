import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  StatusBar, TextInput, ActivityIndicator, SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BACKEND_URL } from '../../config/config';

interface MetroStation {
  id: number;
  name: string;
  city: string;
}

interface MetroStationSelectorProps {
  token: string | null;
  selectedStation: MetroStation | null;
  customStation: string;
  onSelect: (station: MetroStation | null, customStation: string) => void;
  onBack: () => void;
}

const WHATSAPP_COLORS = {
  primary: '#075E54',
  primaryLight: '#128C7E',
  primaryDark: '#054D44',
  secondary: '#25D366',
  accent: '#10B981',
  danger: '#EF4444',
  warning: '#F59E0B',
  background: '#e7e6e5',
  surface: '#FFFFFF',
  textPrimary: '#1F2937',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  border: '#E5E7EB',
  success: '#25D366',
  info: '#3B82F6',
  white: '#FFFFFF',
  backgroundSecondary: '#F5F5F5',
  error: '#EF4444',
};

const MetroStationSelector: React.FC<MetroStationSelectorProps> = ({
  token,
  selectedStation,
  customStation,
  onSelect,
  onBack,
}) => {
  const [metroStations, setMetroStations] = useState<MetroStation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [tempSelectedStation, setTempSelectedStation] = useState<MetroStation | null>(selectedStation);
  const [tempCustomStation, setTempCustomStation] = useState(customStation);
  const [showCustomInput, setShowCustomInput] = useState(false);

  const fetchMetroStations = async (query: string = '') => {
    setLoading(true);
    try {
      let url = `${BACKEND_URL}/core/getAllMetroStations`;
      if (query && query.length >= 1) {
        url = `${BACKEND_URL}/core/getMetroStations?query=${encodeURIComponent(query)}`;
      }
      const response = await fetch(url);
      const data = await response.json();
      if (data.message === "Success" && data.data) {
        setMetroStations(data.data);
      } else {
        setMetroStations([]);
      }
    } catch (error) {
      console.error('Error fetching metro stations:', error);
      setMetroStations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetroStations();
  }, []);

  useEffect(() => {
    if (searchQuery.length >= 1) {
      const delayDebounceFn = setTimeout(() => {
        fetchMetroStations(searchQuery);
      }, 300);
      return () => clearTimeout(delayDebounceFn);
    } else {
      fetchMetroStations();
    }
  }, [searchQuery]);

  const handleStationSelect = (station: MetroStation) => {
    setTempSelectedStation(station);
    setTempCustomStation('');
    setShowCustomInput(false);
  };

  const handleAddCustomStation = () => {
    setShowCustomInput(true);
    setTempSelectedStation(null);
  };

  const handleSaveCustomStation = async () => {
    if (!tempCustomStation.trim() || !token) return;

    try {
      const response = await fetch(`${BACKEND_URL}/core/addMetroStations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: token,
          stations: {
            'Custom': [tempCustomStation]
          }
        }),
      });

      if (response.ok) {
        // Refresh the list to show the new station
        await fetchMetroStations(tempCustomStation);
      }
    } catch (error) {
      console.error('Error adding custom metro station:', error);
    }
  };

  const handleConfirm = () => {
    onSelect(tempSelectedStation, tempCustomStation);
    onBack();
  };

  const handleClear = () => {
    setTempSelectedStation(null);
    setTempCustomStation('');
    setShowCustomInput(false);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={WHATSAPP_COLORS.primary} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Select Metro Station</Text>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Search Box */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={WHATSAPP_COLORS.textSecondary} />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search metro stations..."
            placeholderTextColor={WHATSAPP_COLORS.textTertiary}
            autoFocus={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={WHATSAPP_COLORS.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Selected Station Display */}
        {(tempSelectedStation || tempCustomStation) && (
          <View style={styles.selectedContainer}>
            <View style={styles.selectedContent}>
              <Ionicons name="checkmark-circle" size={20} color={WHATSAPP_COLORS.success} />
              <Text style={styles.selectedText}>
                {tempSelectedStation ? tempSelectedStation.name : tempCustomStation}
              </Text>
            </View>
          </View>
        )}

        {/* Custom Station Input */}
        {showCustomInput && (
          <View style={styles.customInputContainer}>
            <Text style={styles.customInputLabel}>Custom Metro Station</Text>
            <TextInput
              style={styles.customInput}
              value={tempCustomStation}
              onChangeText={setTempCustomStation}
              placeholder="Enter metro station name"
              placeholderTextColor={WHATSAPP_COLORS.textTertiary}
              autoFocus
            />
            <TouchableOpacity
              style={styles.saveCustomButton}
              onPress={handleSaveCustomStation}
            >
              <Text style={styles.saveCustomButtonText}>Save & Add to List</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Metro Stations List */}
        <ScrollView
          style={styles.stationsList}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={WHATSAPP_COLORS.primary} />
              <Text style={styles.loadingText}>Loading stations...</Text>
            </View>
          ) : metroStations.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="train-outline" size={48} color={WHATSAPP_COLORS.textTertiary} />
              <Text style={styles.emptyText}>No metro stations found</Text>
              <Text style={styles.emptySubtext}>
                Try a different search or add a custom station
              </Text>
            </View>
          ) : (
            <>
              {metroStations.map((station) => (
                <TouchableOpacity
                  key={station.id}
                  style={[
                    styles.stationItem,
                    tempSelectedStation?.id === station.id && styles.stationItemSelected
                  ]}
                  onPress={() => handleStationSelect(station)}
                >
                  <View style={styles.stationInfo}>
                    <Text style={[
                      styles.stationName,
                      tempSelectedStation?.id === station.id && styles.stationNameSelected
                    ]}>
                      {station.name}
                    </Text>
                    <Text style={styles.stationCity}>{station.city}</Text>
                  </View>
                  {tempSelectedStation?.id === station.id && (
                    <Ionicons name="checkmark-circle" size={24} color={WHATSAPP_COLORS.success} />
                  )}
                </TouchableOpacity>
              ))}

              {/* Add Custom Station Button */}
              <TouchableOpacity
                style={styles.addCustomButton}
                onPress={handleAddCustomStation}
              >
                <Ionicons name="add-circle" size={24} color={WHATSAPP_COLORS.primary} />
                <Text style={styles.addCustomText}>Add Custom Metro Station</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>

        {/* Confirm Button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.confirmButton,
              !(tempSelectedStation || tempCustomStation) && styles.confirmButtonDisabled
            ]}
            onPress={handleConfirm}
            disabled={!(tempSelectedStation || tempCustomStation)}
          >
            <Text style={styles.confirmButtonText}>Confirm Selection</Text>
            <Ionicons name="checkmark" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: WHATSAPP_COLORS.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: WHATSAPP_COLORS.primary,
    paddingTop:35
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
    marginRight: 24,
    
  },
  clearButton: {
    padding: 4,
  },
  clearButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    backgroundColor: WHATSAPP_COLORS.backgroundSecondary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WHATSAPP_COLORS.white,
    margin: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: WHATSAPP_COLORS.textPrimary,
    marginLeft: 12,
  },
  selectedContainer: {
    backgroundColor: WHATSAPP_COLORS.success + '20',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: WHATSAPP_COLORS.success,
  },
  selectedContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedText: {
    fontSize: 14,
    fontWeight: '600',
    color: WHATSAPP_COLORS.success,
    marginLeft: 8,
  },
  customInputContainer: {
    backgroundColor: WHATSAPP_COLORS.white,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  customInputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: WHATSAPP_COLORS.textPrimary,
    marginBottom: 8,
  },
  customInput: {
    borderWidth: 1,
    borderColor: WHATSAPP_COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: WHATSAPP_COLORS.textPrimary,
    marginBottom: 12,
  },
  saveCustomButton: {
    backgroundColor: WHATSAPP_COLORS.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveCustomButtonText: {
    color: WHATSAPP_COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  stationsList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: WHATSAPP_COLORS.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: WHATSAPP_COLORS.textPrimary,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: WHATSAPP_COLORS.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  stationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: WHATSAPP_COLORS.white,
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  stationItemSelected: {
    backgroundColor: WHATSAPP_COLORS.primary + '10',
    borderWidth: 2,
    borderColor: WHATSAPP_COLORS.success,
  },
  stationInfo: {
    flex: 1,
  },
  stationName: {
    fontSize: 16,
    fontWeight: '600',
    color: WHATSAPP_COLORS.textPrimary,
    marginBottom: 4,
  },
  stationNameSelected: {
    color: WHATSAPP_COLORS.primary,
  },
  stationCity: {
    fontSize: 12,
    color: WHATSAPP_COLORS.textSecondary,
  },
  addCustomButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: WHATSAPP_COLORS.white,
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: WHATSAPP_COLORS.primary,
    borderStyle: 'dashed',
  },
  addCustomText: {
    fontSize: 14,
    fontWeight: '600',
    color: WHATSAPP_COLORS.primary,
    marginLeft: 8,
  },
  footer: {
    padding: 16,
    backgroundColor: WHATSAPP_COLORS.white,
    borderTopWidth: 1,
    borderTopColor: WHATSAPP_COLORS.border,
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: WHATSAPP_COLORS.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  confirmButtonDisabled: {
    backgroundColor: WHATSAPP_COLORS.textTertiary,
    opacity: 0.5,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: WHATSAPP_COLORS.white,
  },
});

export default MetroStationSelector;