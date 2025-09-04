// DropdownComponents.tsx - Month and Year Dropdown Components
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Dimensions,
} from 'react-native';
import { colors, spacing, fontSize, borderRadius, shadows } from '../../styles/theme';
import { monthNames, getYearsList } from './utils';

const { height: screenHeight } = Dimensions.get('window');

interface MonthDropdownProps {
  visible: boolean;
  selectedMonth: number;
  onClose: () => void;
  onSelect: (month: number) => void;
}

interface YearDropdownProps {
  visible: boolean;
  selectedYear: number;
  onClose: () => void;
  onSelect: (year: number) => void;
}

export const MonthDropdown: React.FC<MonthDropdownProps> = ({
  visible,
  selectedMonth,
  onClose,
  onSelect,
}) => (
  <Modal
    visible={visible}
    transparent
    animationType="fade"
    onRequestClose={onClose}
  >
    <TouchableOpacity
      style={styles.dropdownOverlay}
      onPress={onClose}
    >
      <View style={styles.dropdownContainer}>
        <ScrollView style={styles.dropdownContent}>
          {monthNames.map((month, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.dropdownItem,
                selectedMonth === index + 1 && styles.selectedDropdownItem
              ]}
              onPress={() => {
                onSelect(index + 1);
                onClose();
              }}
            >
              <Text style={[
                styles.dropdownItemText,
                selectedMonth === index + 1 && styles.selectedDropdownItemText
              ]}>
                {month}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </TouchableOpacity>
  </Modal>
);

export const YearDropdown: React.FC<YearDropdownProps> = ({
  visible,
  selectedYear,
  onClose,
  onSelect,
}) => {
  const years = getYearsList();
  
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.dropdownOverlay}
        onPress={onClose}
      >
        <View style={styles.dropdownContainer}>
          <ScrollView style={styles.dropdownContent}>
            {years.map((year) => (
              <TouchableOpacity
                key={year}
                style={[
                  styles.dropdownItem,
                  selectedYear === year && styles.selectedDropdownItem
                ]}
                onPress={() => {
                  onSelect(year);
                  onClose();
                }}
              >
                <Text style={[
                  styles.dropdownItemText,
                  selectedYear === year && styles.selectedDropdownItemText
                ]}>
                  {year}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  dropdownContainer: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    width: '80%',
    maxHeight: screenHeight * 0.6,
    ...shadows.lg,
  },
  dropdownContent: {
    maxHeight: screenHeight * 0.5,
  },
  dropdownItem: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  selectedDropdownItem: {
    backgroundColor: colors.backgroundSecondary,
  },
  dropdownItemText: {
    fontSize: fontSize.md,
    color: colors.text,
    fontWeight: '500',
  },
  selectedDropdownItemText: {
    color: colors.primary,
    fontWeight: '600',
  },
});