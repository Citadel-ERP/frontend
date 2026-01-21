import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  Dimensions,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { styles } from './styles';
import { WHATSAPP_COLORS } from './constants';
import { RequestNature, TabType, OTHER_OPTION } from './types';

interface DropdownModalProps {
  visible: boolean;
  onClose: () => void;
  natures: RequestNature[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSelectNature: (nature: RequestNature) => void;
  activeTab: TabType;
}

export const DropdownModal: React.FC<DropdownModalProps> = ({
  visible,
  onClose,
  natures,
  searchQuery,
  onSearchChange,
  onSelectNature,
  activeTab
}) => {
  const insets = useSafeAreaInsets();
  const searchInputRef = useRef<TextInput>(null);
  const filteredNatures = natures.filter(nature =>
    nature.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (nature.description && nature.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  useEffect(() => {
    if (visible && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [visible]);

  const getIconForNature = (natureName: string) => {
    const name = natureName.toLowerCase();
    
    if (activeTab === 'requests') {
      if (name.includes('leave') || name.includes('time off')) return 'calendar-outline';
      if (name.includes('salary') || name.includes('pay')) return 'cash-outline';
      if (name.includes('promotion') || name.includes('raise')) return 'trending-up-outline';
      if (name.includes('transfer')) return 'swap-horizontal-outline';
      if (name.includes('training')) return 'school-outline';
      if (name.includes('equipment')) return 'desktop-outline';
      return 'document-text-outline';
    } else {
      if (name.includes('harassment')) return 'warning-outline';
      if (name.includes('discrimination')) return 'ban-outline';
      if (name.includes('workload')) return 'barbell-outline';
      if (name.includes('management')) return 'people-outline';
      if (name.includes('policy')) return 'book-outline';
      if (name.includes('facility')) return 'business-outline';
      return 'alert-circle-outline';
    }
  };

  const getCategoryIcon = () => {
    return activeTab === 'requests' ? 'document-text' : 'alert-circle';
  };
  const screenHeight = Dimensions.get('window').height;
  
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContainer, { height: screenHeight * 0.85, marginTop: insets.top + 50 }]}>
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderContent}>
              <View style={styles.modalIconContainer}>
                <Ionicons 
                  name={getCategoryIcon()} 
                  size={24} 
                  color={WHATSAPP_COLORS.white} 
                />
              </View>
              <View style={styles.modalTitleContainer}>
                <Text style={styles.modalTitle}>
                  Select {activeTab === 'requests' ? 'Request' : 'Grievance'} Type
                </Text>
                <Text style={styles.modalSubtitle}>
                  Choose from the available options
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
              <Ionicons name="close" size={24} color={WHATSAPP_COLORS.white} />
            </TouchableOpacity>
          </View>

          <View style={styles.modalSearchSection}>
            <View style={styles.searchContainerModal}>
              <Ionicons name="search" size={20} color={WHATSAPP_COLORS.gray} style={styles.searchIconModal} />
              <TextInput
                ref={searchInputRef}
                style={styles.searchInputModal}
                value={searchQuery}
                onChangeText={onSearchChange}
                placeholder={`Search ${activeTab === 'requests' ? 'request types...' : 'grievance types...'}`}
                placeholderTextColor={WHATSAPP_COLORS.gray}
                autoFocus={true}
                returnKeyType="search"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => onSearchChange('')}>
                  <Ionicons name="close-circle" size={20} color={WHATSAPP_COLORS.gray} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          <FlatList
            data={filteredNatures}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            style={styles.dropdownList}
            contentContainerStyle={styles.dropdownListContent}
            renderItem={({ item, index }) => (
              <TouchableOpacity
                style={[
                  styles.dropdownItem,
                  index === 0 && styles.dropdownItemFirst,
                  index === filteredNatures.length - 1 && styles.dropdownItemLast
                ]}
                onPress={() => onSelectNature(item)}
                activeOpacity={0.6}
              >
                <View style={[
                  styles.dropdownItemIcon,
                  { backgroundColor: item.id === 'other' ? 'rgba(156, 39, 176, 0.1)' : 'rgba(18, 140, 126, 0.1)' }
                ]}>
                  <Ionicons
                    name={item.id === 'other' ? 'ellipsis-horizontal' : getIconForNature(item.name)}
                    size={24}
                    color={item.id === 'other' ? WHATSAPP_COLORS.purple : WHATSAPP_COLORS.primary}
                  />
                </View>
                <View style={styles.dropdownItemContent}>
                  <Text style={styles.dropdownItemText}>{item.name}</Text>
                  {item.description && (
                    <Text style={styles.dropdownItemDescription} numberOfLines={2}>
                      {item.description}
                    </Text>
                  )}
                </View>
                <Ionicons 
                  name="chevron-forward" 
                  size={20} 
                  color={WHATSAPP_COLORS.gray} 
                  style={styles.dropdownItemArrow}
                />
              </TouchableOpacity>
            )}
            ListEmptyComponent={() => (
              <View style={styles.emptyDropdown}>
                <Ionicons name="search-outline" size={60} color={WHATSAPP_COLORS.gray} />
                <Text style={styles.emptyDropdownTitle}>
                  No matching results
                </Text>
                <Text style={styles.emptyDropdownText}>
                  No {activeTab} found for "{searchQuery}"
                </Text>
                <TouchableOpacity 
                  style={styles.emptyDropdownButton}
                  onPress={() => onSearchChange('')}
                >
                  <Text style={styles.emptyDropdownButtonText}>Clear Search</Text>
                </TouchableOpacity>
              </View>
            )}
            ListHeaderComponent={() => (
              filteredNatures.length > 0 ? (
                <View style={styles.resultsHeader}>
                  <Text style={styles.resultsText}>
                    {filteredNatures.length} {filteredNatures.length === 1 ? 'type' : 'types'} found
                  </Text>
                </View>
              ) : null
            )}
          />

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.customOptionButton} onPress={() => onSelectNature(OTHER_OPTION)}>
              <Ionicons name="add-circle-outline" size={20} color={WHATSAPP_COLORS.primary} />
              <Text style={styles.customOptionButtonText}>Custom Option</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};