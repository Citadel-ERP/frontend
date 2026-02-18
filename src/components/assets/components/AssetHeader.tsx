import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface AssetHeaderProps {
  title: string;
  onBack: () => void;
  onSearch: (query: string) => void;
  searchQuery: string;
  onAddPress: () => void;
  onUploadPress: () => void;
  isDark?: boolean;
}

export const AssetHeader: React.FC<AssetHeaderProps> = ({
  title,
  onBack,
  onSearch,
  searchQuery,
  onAddPress,
  onUploadPress,
  isDark = false,
}) => {
  const theme = {
    bgColor: isDark ? '#111a2d' : '#f6f6f6',
    textMain: isDark ? '#ffffff' : '#333333',
    textSub: isDark ? '#a0a0a0' : '#666666',
    accentBlue: '#008069',
  };

  return (
    <View style={[styles.header, { backgroundColor: theme.accentBlue }]}>
      <View style={styles.topRow}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={onUploadPress} style={styles.headerButton}>
            <Ionicons name="cloud-upload-outline" size={24} color="white" />
          </TouchableOpacity>
          <TouchableOpacity onPress={onAddPress} style={styles.headerButton}>
            <Ionicons name="add" size={28} color="white" />
          </TouchableOpacity>
        </View>
      </View>
      
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="rgba(255,255,255,0.8)" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search assets..."
          placeholderTextColor="rgba(255,255,255,0.6)"
          value={searchQuery}
          onChangeText={onSearch}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => onSearch('')}>
            <Ionicons name="close-circle" size={20} color="white" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingTop: Platform.OS === 'ios' ? 70 : 20,
    paddingBottom: 16,
    marginTop:-60,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: 'white',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    padding: 4,
    marginLeft: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginHorizontal: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: 'white',
    fontSize: 16,
    padding: 0,
  },
});