// hr_employee_management/searchAndDownload.tsx
import React from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WHATSAPP_COLORS } from './constants';
import { styles } from './styles';

interface SearchAndDownloadProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onDownload: () => void;
  placeholder: string;
}

const SearchAndDownload: React.FC<SearchAndDownloadProps> = ({
  searchQuery,
  onSearchChange,
  onDownload,
  placeholder,
}) => {
  const [searchFocused, setSearchFocused] = React.useState(false);

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
            style={styles.clearButton}
            onPress={() => onSearchChange('')}
            activeOpacity={0.7}
          >
            <Ionicons name="close-circle" size={18} color={WHATSAPP_COLORS.textTertiary} />
          </TouchableOpacity>
        )}
      </View>
      
      <TouchableOpacity
        style={styles.downloadButton}
        onPress={onDownload}
        activeOpacity={0.8}
      >
        <Ionicons name="download-outline" size={20} color="#fff" />
        <Text style={styles.downloadButtonText}>Download</Text>
      </TouchableOpacity>
    </View>
  );
};

export default SearchAndDownload;