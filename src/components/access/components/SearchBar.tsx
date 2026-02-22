/**
 * Search Bar Component
 */

import React from 'react';
import { View, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WHATSAPP_COLORS } from '../constants';
import { styles } from '../styles';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onClear?: () => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChangeText,
  placeholder = 'Search...',
  onClear,
}) => {
  const handleClear = () => {
    onChangeText('');
    onClear?.();
  };

  return (
    <View style={styles.searchContainer}>
      <Ionicons name="search" size={20} color={WHATSAPP_COLORS.textTertiary} style={styles.searchIcon} />
      <TextInput
        style={styles.searchInput}
        placeholder={placeholder}
        placeholderTextColor={WHATSAPP_COLORS.textTertiary}
        value={value}
        onChangeText={onChangeText}
      />
      {value ? (
        <TouchableOpacity onPress={handleClear}>
          <Ionicons name="close-circle" size={20} color={WHATSAPP_COLORS.textTertiary} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
};