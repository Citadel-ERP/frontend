import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WHATSAPP_COLORS } from './constants';
import { styles } from './styles';

interface SearchProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  placeholder: string;
}

export const Search: React.FC<SearchProps> = ({
  searchQuery,
  onSearchChange,
  placeholder,
}) => {
  const [searchFocused, setSearchFocused] = useState(false);

  return (
    <View style={styles.searchContainer}>
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
    </View>
  );
};