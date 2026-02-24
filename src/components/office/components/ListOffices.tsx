import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Office } from '../types/office.types';

interface ListOfficesProps {
  offices: Office[];
  onEdit: (office: Office) => void;
  onDelete: (office: Office) => void;
  isDark: boolean;
}

export const ListOffices: React.FC<ListOfficesProps> = ({
  offices,
  onEdit,
  onDelete,
  isDark,
}) => {
  const theme = {
    cardBg: isDark ? '#111a2d' : '#f6f6f6',
    textMain: isDark ? '#ffffff' : '#333333',
    textSub: isDark ? '#a0a0a0' : '#666666',
    borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
  };

  const renderOfficeCard = ({ item }: { item: Office }) => (
    <View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.borderColor }]}>
      <View style={styles.cardHeader}>
        <View style={styles.officeIcon}>
          <Ionicons name="business" size={24} color="#008069" />
        </View>
        <View style={styles.officeInfo}>
          <Text style={[styles.officeName, { color: theme.textMain }]}>
            {item.name}
          </Text>
          <Text style={[styles.officeAddress, { color: theme.textSub }]}>
            {item.address.address}, {item.address.city}
          </Text>
        </View>
      </View>

      <View style={styles.coordinatesContainer}>
        <View style={styles.coordinateItem}>
          <Ionicons name="locate" size={14} color={theme.textSub} />
          <Text style={[styles.coordinateText, { color: theme.textSub }]}>
            {item.latitude?.toFixed(6) ?? 'N/A'}, {item.longitude?.toFixed(6) ?? 'N/A'}
          </Text>
        </View>
        <View style={styles.coordinateBadge}>
          <Ionicons name="map" size={12} color="#008069" />
          <Text style={styles.badgeText}>Geo-fenced</Text>
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: theme.borderColor }]} />

      <View style={styles.fullAddress}>
        <Ionicons name="location-outline" size={16} color={theme.textSub} />
        <Text style={[styles.fullAddressText, { color: theme.textSub }]}>
          {item.address.address}, {item.address.city}, {item.address.state}, {item.address.country} - {item.address.zip_code}
        </Text>
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={() => onEdit(item)}
        >
          <Ionicons name="create-outline" size={20} color="#008069" />
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => onDelete(item)}
        >
          <Ionicons name="trash-outline" size={20} color="#EF4444" />
          <Text style={styles.deleteButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (offices.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="business-outline" size={80} color={theme.textSub} />
        <Text style={[styles.emptyTitle, { color: theme.textMain }]}>
          No Offices Found
        </Text>
        <Text style={[styles.emptyText, { color: theme.textSub }]}>
          Click the + button to create your first office location
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={offices}
      renderItem={renderOfficeCard}
      keyExtractor={(item) => item.id.toString()}
      contentContainerStyle={styles.listContainer}
      showsVerticalScrollIndicator={false}
    />
  );
};

const styles = StyleSheet.create({
  listContainer: {
    paddingBottom: 20,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
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
    marginBottom: 12,
  },
  officeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 128, 105, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  officeInfo: {
    flex: 1,
  },
  officeName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  officeAddress: {
    fontSize: 14,
  },
  coordinatesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  coordinateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  coordinateText: {
    fontSize: 13,
    fontFamily: 'monospace',
  },
  coordinateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 128, 105, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  badgeText: {
    color: '#008069',
    fontSize: 11,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  fullAddress: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  fullAddressText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  editButton: {
    backgroundColor: 'rgba(0, 128, 105, 0.1)',
  },
  editButtonText: {
    color: '#008069',
    fontSize: 14,
    fontWeight: '500',
  },
  deleteButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  deleteButtonText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 400,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});