import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { ThemeColors } from './types';

interface HeaderProps {
  title: string;
  onBack: () => void;
  onThemeToggle?: () => void;
  isDarkMode: boolean;
  theme: ThemeColors;
  showThemeToggle?: boolean;
  showEditButton?: boolean;
  showSaveButton?: boolean;
  onEdit?: () => void;
  onSave?: () => void;
  loading?: boolean;
}

const Header: React.FC<HeaderProps> = ({
  title,
  onBack,
  onThemeToggle,
  isDarkMode,
  theme,
  showThemeToggle = false,
  showEditButton = false,
  showSaveButton = false,
  onEdit,
  onSave,
  loading = false,
}) => {
  const BackIcon = () => (
    <View style={styles.backIcon}>
      <Text style={styles.backIconText}>‹</Text>
    </View>
  );

  return (
    <View style={[styles.header, { backgroundColor: theme.headerBg }]}>
      <TouchableOpacity style={styles.backButton} onPress={onBack}>
        <BackIcon />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{title}</Text>
      <View style={styles.headerActions}>
        {showEditButton && onEdit && (
          <TouchableOpacity style={[styles.editButton, { backgroundColor: theme.info }]} onPress={onEdit}>
            <Text style={[styles.editButtonText, { color: theme.white }]}>Edit</Text>
          </TouchableOpacity>
        )}
        {showSaveButton && onSave && (
          <TouchableOpacity 
            style={[styles.saveButton, { backgroundColor: theme.success }, loading && styles.buttonDisabled]} 
            onPress={onSave}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={theme.white} size="small" />
            ) : (
              <Text style={[styles.saveButtonText, { color: theme.white }]}>Save</Text>
            )}
          </TouchableOpacity>
        )}
        {showThemeToggle && onThemeToggle && (
          <TouchableOpacity onPress={onThemeToggle} style={styles.themeToggleButton}>
            <Text style={styles.themeIcon}>
              {isDarkMode ? '☀️' : '🌙'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  backButton: {
    padding: 8,
  },
  backIcon: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIconText: {
    fontSize: 24,
    color: 'white',
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  saveButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  themeToggleButton: {
    padding: 8,
  },
  themeIcon: {
    fontSize: 20,
  },
});

export default Header;