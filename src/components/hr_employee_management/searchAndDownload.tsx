// hr_employee_management/searchAndDownload.tsx
import React from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  Modal,
  StyleSheet,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WHATSAPP_COLORS } from './constants';
import { styles } from './styles';

interface SearchAndDownloadProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onDownloadEmployees: () => void;
  onDownloadAttendance: () => void;
  onOpenHolidays: () => void;
  placeholder: string;
}

const SearchAndDownload: React.FC<SearchAndDownloadProps> = ({
  searchQuery,
  onSearchChange,
  onDownloadEmployees,
  onDownloadAttendance,
  onOpenHolidays,
  placeholder,
}) => {
  const [searchFocused, setSearchFocused] = React.useState(false);
  const [optionsVisible, setOptionsVisible] = React.useState(false);

  const handleOptionPress = (action: () => void) => {
    setOptionsVisible(false);
    action();
  };

  return (
    <View style={styles.searchAndDownloadContainer}>
      <View style={[
        styles.searchInputContainer,
        searchFocused && styles.searchInputContainerFocused
      ]}>
        <Ionicons
          name="search"
          size={18}
          color={searchFocused ? WHATSAPP_COLORS.accent : WHATSAPP_COLORS.textTertiary}
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder={placeholder}
          placeholderTextColor={WHATSAPP_COLORS.textTertiary}
          value={searchQuery}
          onChangeText={onSearchChange}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          clearButtonMode="while-editing"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            style={[styles.clearButton,{marginLeft: -40}]}
            onPress={() => onSearchChange('')}
            activeOpacity={0.7}
          >
            <Ionicons name="close-circle" size={18} color={WHATSAPP_COLORS.textTertiary} />
          </TouchableOpacity>
        )}
      </View>
      
      <TouchableOpacity
        style={[localStyles.optionsButton,{marginTop:5}]}
        onPress={() => setOptionsVisible(true)}
        activeOpacity={0.8}
      >
        <Ionicons name="settings" size={20} color="#fff" />
      </TouchableOpacity>

      {/* Options Modal */}
      <Modal
        visible={optionsVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setOptionsVisible(false)}
      >
        <Pressable 
          style={localStyles.modalOverlay}
          onPress={() => setOptionsVisible(false)}
        >
          <View style={localStyles.modalContent}>
            
            <TouchableOpacity
              style={localStyles.optionItem}
              onPress={() => handleOptionPress(onOpenHolidays)}
              activeOpacity={0.7}
            >
              <Ionicons name="calendar-outline" size={20} color="#2D3748" />
              <Text style={localStyles.optionText}>Holidays</Text>
            </TouchableOpacity>

            <View style={localStyles.optionDivider} />

            <TouchableOpacity
              style={localStyles.optionItem}
              onPress={() => handleOptionPress(onDownloadAttendance)}
              activeOpacity={0.7}
            >
              <Ionicons name="document-text-outline" size={20} color="#2D3748" />
              <Text style={localStyles.optionText}>Download Attendance Report</Text>
            </TouchableOpacity>

            <View style={localStyles.optionDivider} />

            <TouchableOpacity
              style={localStyles.optionItem}
              onPress={() => handleOptionPress(onDownloadEmployees)}
              activeOpacity={0.7}
            >
              <Ionicons name="download-outline" size={20} color="#2D3748" />
              <Text style={localStyles.optionText}>Download Employee Data</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

const localStyles = StyleSheet.create({
  optionsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: WHATSAPP_COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 8,
    minWidth: 330,
    maxWidth: 350,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  optionText: {
    marginLeft: 12,
    fontSize: 15,
    color: '#2D3748',
    fontWeight: '500',
  },
  optionDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 12,
  },
});

export default SearchAndDownload;