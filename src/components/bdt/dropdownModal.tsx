import React, { useState, useEffect } from 'react';
import {
  Modal,
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
} from 'react-native';
import { DropdownModalProps, ThemeColors } from './types';
import { lightTheme, darkTheme } from './theme';

const DropdownModal: React.FC<DropdownModalProps & { theme: ThemeColors }> = ({ 
  visible, onClose, options, onSelect, title, searchable = false, theme 
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  
  const filteredOptions = searchable 
    ? options.filter(option => option.label.toLowerCase().includes(searchQuery.toLowerCase()))
    : options;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={[styles.modalOverlay, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
          <View style={[styles.dropdownContainer, { backgroundColor: theme.cardBg }]}>
            <Text style={[styles.dropdownTitle, { color: theme.text }]}>{title}</Text>
            {searchable && (
              <View style={styles.searchContainer}>
                <TextInput
                  style={[styles.searchInput, { 
                    backgroundColor: theme.backgroundSecondary,
                    color: theme.text,
                    borderColor: theme.border
                  }]}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search..."
                  placeholderTextColor={theme.textSecondary}
                />
              </View>
            )}
            <FlatList
              data={filteredOptions}
              keyExtractor={(item) => item.value}
              showsVerticalScrollIndicator={false}
              style={styles.dropdownList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.dropdownItem, { borderBottomColor: theme.border }]}
                  onPress={() => { onSelect(item.value); onClose(); }}
                >
                  <Text style={[styles.dropdownItemText, { color: theme.text }]}>{item.label}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={() => (
                <View style={styles.emptyDropdown}>
                  <Text style={[styles.emptyDropdownText, { color: theme.textSecondary }]}>No options found</Text>
                </View>
              )}
            />
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: { 
    flex: 1, 
    justifyContent: 'center', 
    paddingHorizontal: 20,
  },
  dropdownContainer: {
    borderRadius: 16,
    maxHeight: 400,
  },
  dropdownTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  searchContainer: {
    padding: 15,
  },
  searchInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 16,
  },
  dropdownList: {
    maxHeight: 300,
  },
  dropdownItem: { 
    paddingHorizontal: 15,
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  dropdownItemText: {
    fontSize: 16,
    fontWeight: '500',
  },
  emptyDropdown: {
    padding: 30,
    alignItems: 'center',
  },
  emptyDropdownText: {
    fontSize: 16,
    textAlign: 'center',
  },
});

export default DropdownModal;