import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Office } from '../types/office.types';  // Import Office type

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Rename the props interface to avoid conflict
interface OfficeCardProps {
  office: Office;
  onEdit: (office: Office) => void;
  onDelete: (office: Office) => void;
  isDark: boolean;
}

export const OfficeCard: React.FC<OfficeCardProps> = ({
  office,
  onEdit,
  onDelete,
  isDark,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [animation] = useState(new Animated.Value(0));

  const theme = {
    cardBg: isDark ? '#111a2d' : '#f6f6f6',
    textMain: isDark ? '#ffffff' : '#333333',
    textSub: isDark ? '#a0a0a0' : '#666666',
    borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
    accentBlue: '#008069',
    danger: '#EF4444',
    warning: '#F59E0B',
  };

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
    
    Animated.timing(animation, {
      toValue: expanded ? 0 : 1,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  const rotateArrow = animation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const formatAddress = () => {
    const { address } = office;
    return `${address.address}, ${address.city}, ${address.state} - ${address.zip_code}`;
  };

  const getCoordinatesDisplay = () => {
  if (!office.latitude || !office.longitude) {
    return 'Coordinates not available';
  }
  return `${office.latitude.toFixed(6)}, ${office.longitude.toFixed(6)}`;
};

  return (
    <View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.borderColor }]}>
      {/* Main Card Header - Always Visible */}
      <TouchableOpacity onPress={toggleExpand} activeOpacity={0.7} style={styles.cardHeader}>
        <View style={styles.leftSection}>
          <View style={[styles.iconContainer, { backgroundColor: 'rgba(0, 128, 105, 0.1)' }]}>
            <Ionicons name="business" size={24} color={theme.accentBlue} />
          </View>
          <View style={styles.infoSection}>
            <Text style={[styles.officeName, { color: theme.textMain }]} numberOfLines={1}>
              {office.name}
            </Text>
            <Text style={[styles.officeCity, { color: theme.textSub }]} numberOfLines={1}>
              {office.address.city}, {office.address.state}
            </Text>
          </View>
        </View>
        
        <Animated.View style={{ transform: [{ rotate: rotateArrow }] }}>
          <Ionicons name="chevron-down" size={20} color={theme.textSub} />
        </Animated.View>
      </TouchableOpacity>

      {/* Quick Info Row - Always Visible */}
      <View style={styles.quickInfoRow}>
        <View style={styles.coordinatePill}>
          <Ionicons name="locate" size={12} color={theme.accentBlue} />
          <Text style={[styles.coordinateText, { color: theme.textSub }]}>
            {getCoordinatesDisplay()}
          </Text>
        </View>
        
        <View style={styles.employeeCountPill}>
          <Ionicons name="people" size={12} color={theme.textSub} />
          <Text style={[styles.employeeCountText, { color: theme.textSub }]}>
            {/* This would need actual employee count from API */}
            0 employees
          </Text>
        </View>
      </View>

      {/* Expanded Content */}
      {expanded && (
        <View style={styles.expandedContent}>
          <View style={[styles.divider, { backgroundColor: theme.borderColor }]} />
          
          {/* Full Address */}
          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={18} color={theme.textSub} />
            <Text style={[styles.detailText, { color: theme.textSub }]}>
              {formatAddress()}
            </Text>
          </View>

          {/* Country */}
          <View style={styles.detailRow}>
            <Ionicons name="flag-outline" size={18} color={theme.textSub} />
            <Text style={[styles.detailText, { color: theme.textSub }]}>
              {office.address.country}
            </Text>
          </View>

          {/* Geo-fencing Status */}
          <View style={[styles.statusRow, { backgroundColor: 'rgba(0, 128, 105, 0.1)' }]}>
            <Ionicons name="map" size={16} color={theme.accentBlue} />
            <Text style={[styles.statusText, { color: theme.accentBlue }]}>
              Geo-fencing Enabled
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.editButton]}
              onPress={() => onEdit(office)}
            >
              <Ionicons name="create-outline" size={18} color={theme.accentBlue} />
              <Text style={[styles.actionButtonText, { color: theme.accentBlue }]}>
                Edit
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={() => onDelete(office)}
            >
              <Ionicons name="trash-outline" size={18} color={theme.danger} />
              <Text style={[styles.actionButtonText, { color: theme.danger }]}>
                Delete
              </Text>
            </TouchableOpacity>
          </View>

          {/* Warning for offices with employees (if API provides count) */}
          {/* This is a placeholder - you'd need to get actual employee count */}
          {false && (
            <View style={[styles.warningBox, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
              <Ionicons name="warning" size={16} color={theme.warning} />
              <Text style={[styles.warningText, { color: theme.warning }]}>
                5 employees assigned to this office
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoSection: {
    flex: 1,
  },
  officeName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  officeCity: {
    fontSize: 13,
  },
  quickInfoRow: {
    flexDirection: 'row',
    marginTop: 12,
    marginLeft: 60, // Align with icon width + margin
    gap: 8,
  },
  coordinatePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  coordinateText: {
    fontSize: 11,
    fontFamily: 'monospace',
  },
  employeeCountPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  employeeCountText: {
    fontSize: 11,
  },
  expandedContent: {
    marginTop: 16,
  },
  divider: {
    height: 1,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
    paddingHorizontal: 4,
  },
  detailText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginVertical: 8,
    gap: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  editButton: {
    backgroundColor: 'rgba(0, 128, 105, 0.1)',
  },
  deleteButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
  },
});