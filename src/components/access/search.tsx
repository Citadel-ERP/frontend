// access/search.tsx
import React, { useCallback } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Text,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from './types';

interface SearchProps {
  value: string;
  onChange: (text: string) => void;
  placeholder?: string;
  resultCount?: number;
}

const Search: React.FC<SearchProps> = ({
  value,
  onChange,
  placeholder = 'Search...',
  resultCount,
}) => {
  const handleClear = useCallback(() => onChange(''), [onChange]);

  return (
    <View style={styles.container}>
      <View style={styles.inputWrapper}>
        <Ionicons name="search" size={18} color={COLORS.textTertiary} style={styles.leadingIcon} />
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textTertiary}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
          clearButtonMode="never" // custom clear
        />
        {value.length > 0 && (
          <TouchableOpacity onPress={handleClear} style={styles.clearBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={18} color={COLORS.textTertiary} />
          </TouchableOpacity>
        )}
      </View>
      {resultCount !== undefined && value.length > 0 && (
        <View style={styles.resultBadge}>
          <Text style={styles.resultText}>{resultCount} result{resultCount !== 1 ? 's' : ''}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: COLORS.background,
    gap: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    height: 44,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  leadingIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: COLORS.textPrimary,
    paddingVertical: 0,
  },
  clearBtn: {
    marginLeft: 6,
    padding: 2,
  },
  resultBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.primary + '15',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  resultText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '600',
  },
});

export default Search;