import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BACKEND_URL } from '../../config/config';

const WHATSAPP_COLORS = {
  primary: '#075E54',
  primaryLight: '#128C7E',
  primaryDark: '#054D44',
  secondary: '#25D366',
  accent: '#10B981',
  danger: '#EF4444',
  warning: '#F59E0B',
  background: '#F9FAFB',
  surface: '#FFFFFF',
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  border: '#E5E7EB',
  success: '#25D366',
  info: '#3B82F6',
  white: '#FFFFFF',
  backgroundSecondary: '#F3F4F6',
  overlay: 'rgba(0, 0, 0, 0.5)',
  chipBackground: '#F3F4F6',
  selected: '#EBF5FF',
  selectedBorder: '#3B82F6',
  lightBlue: '#E0F2FE',
  lightGreen: '#D1FAE5',
  lightYellow: '#FEF3C7',
  lightRed: '#FEE2E2',
  lightPurple: '#EDE9FE',
};

interface Visit {
  id: number;
  site: {
    building_name: string;
    location: string;
    managed_property: boolean;
    conventional_property: boolean;
    rent?: string;
    rent_per_seat?: string;
    total_area?: string;
    building_status?: string;
    floor_condition?: string;
  };
  status: string;
  created_at: string;
  updated_at: string;
  building_photos: any[];
}

interface Pagination {
  current_page: number;
  total_pages: number;
  total_items: number;
  page_size: number;
  has_next: boolean;
  has_previous: boolean;
}

interface ListVisitsProps {
  visits: Visit[];
  loading: boolean;
  loadingMore: boolean;
  refreshing: boolean;
  pagination: Pagination | null;
  onVisitPress: (visit: Visit, index: number) => void;
  onLoadMore: () => void;
  onRefresh: () => void;
  token: string | null;
  theme: any;
  isDarkMode: boolean;
  selectionMode: boolean;
  selectedVisits: number[];
  onVisitSelection: (visitId: number) => void;
  onLongPress: (visitId: number) => void;
}

const VisitsList: React.FC<ListVisitsProps> = ({
  visits,
  loading,
  loadingMore,
  refreshing,
  pagination,
  onVisitPress,
  onLoadMore,
  onRefresh,
  token,
  theme,
  isDarkMode,
  selectionMode,
  selectedVisits,
  onVisitSelection,
  onLongPress,
}) => {
  const [markingComplete, setMarkingComplete] = useState(false);

  // Helper Functions
  const beautifyName = useCallback((name: string): string => {
    if (!name) return '';
    return name
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }, []);

  const formatDate = useCallback((dateString: string): string => {
    if (!dateString) return '';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '';

    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 1) {
      return 'Today';
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short'
      });
    }
  }, []);

  const getStatusColor = useCallback((status: string): string => {
    switch (status?.toLowerCase()) {
      case 'scout_completed':
      case 'admin_completed':
        return WHATSAPP_COLORS.success;
      case 'pending':
        return WHATSAPP_COLORS.warning;
      case 'cancelled':
        return WHATSAPP_COLORS.danger;
      default:
        return WHATSAPP_COLORS.textSecondary;
    }
  }, []);

  const getPropertyType = useCallback((visit: Visit): string => {
    if (visit.site.managed_property) return '💼 Managed';
    if (visit.site.conventional_property) return '🏛️ Conventional';
    return '🏢 Office';
  }, []);

  const formatCurrency = useCallback((value: string | number): string => {
    if (!value) return '';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '';

    if (num >= 10000000) {
      return `₹${(num / 10000000).toFixed(2)}Cr`;
    } else if (num >= 100000) {
      return `₹${(num / 100000).toFixed(2)}L`;
    } else if (num >= 1000) {
      return `₹${(num / 1000).toFixed(2)}K`;
    }
    return `₹${num.toLocaleString('en-IN')}`;
  }, []);

  const getPropertyTypeBadgeColor = (visit: Visit): string => {
    if (visit.site.managed_property) return WHATSAPP_COLORS.lightBlue;
    if (visit.site.conventional_property) return WHATSAPP_COLORS.lightGreen;
    return WHATSAPP_COLORS.chipBackground;
  };

  // Render Visit Item
  const renderVisitItem = useCallback((visit: Visit, index: number) => {
    const lastUpdated = formatDate(visit.updated_at);
    const statusColor = getStatusColor(visit.status);
    const propertyType = getPropertyType(visit);
    const isSelected = selectedVisits.includes(visit.id);

    const pricingText = visit.site.managed_property && visit.site.rent_per_seat
      ? `${formatCurrency(visit.site.rent_per_seat)}/seat`
      : visit.site.rent && visit.site.total_area
        ? `${formatCurrency(parseFloat(visit.site.rent) / parseFloat(visit.site.total_area))}/sq-ft`
        : visit.site.rent ? formatCurrency(visit.site.rent) : '';

    const handleCardPress = () => {
      if (selectionMode) {
        onVisitSelection(visit.id);
      } else {
        onVisitPress(visit, index);
      }
    };

    const handleCardLongPress = () => {
      onLongPress(visit.id);
    };

    return (
      <TouchableOpacity
        key={visit.id}
        style={[
          styles.visitCard,
          isSelected && styles.visitCardSelected
        ]}
        onPress={handleCardPress}
        onLongPress={handleCardLongPress}
        activeOpacity={0.7}
      >
        {/* Selection Checkbox - Positioned at bottom left */}
        {selectionMode && (
          <View style={styles.selectionCheckbox}>
            <View style={[
              styles.checkbox,
              isSelected && styles.checkboxSelected
            ]}>
              {isSelected && (
                <Ionicons name="checkmark" size={16} color={WHATSAPP_COLORS.white} />
              )}
            </View>
          </View>
        )}

        {/* Card Content */}
        <View style={styles.cardContent}>
          {/* Header Row */}
          <View style={styles.cardHeader}>
            <View style={styles.headerLeft}>
              <Text style={styles.visitName} numberOfLines={1}>
                {visit.site.building_name || 'Unnamed Site'}
              </Text>
              <Text style={styles.visitDate}>{lastUpdated}</Text>
            </View>
          </View>

          {/* Location Row */}
          {visit.site.location && (
            <View style={styles.locationRow}>
              <Ionicons name="location" size={14} color={WHATSAPP_COLORS.textSecondary} />
              <Text style={styles.locationText} numberOfLines={1}>
                {visit.site.location}
              </Text>
            </View>
          )}

          {/* Details ScrollView */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.detailsScrollContainer}
            contentContainerStyle={styles.detailsGrid}
          >
            {/* Status Badge */}
            <View style={[styles.statusBadge, { backgroundColor: statusColor + '15' }]}>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <Text style={[styles.statusText, { color: statusColor }]}>
                {beautifyName(visit.status || 'unknown')}
              </Text>
            </View>

            {/* Property Type Badge */}
            <View style={[styles.propertyTypeBadge, { backgroundColor: getPropertyTypeBadgeColor(visit) }]}>
              <Text style={styles.propertyTypeText}>{propertyType}</Text>
            </View>

            {/* Building Status */}
            {visit.site.building_status && (
              <View style={[styles.detailChip, { backgroundColor: WHATSAPP_COLORS.lightBlue }]}>
                <Ionicons name="business-outline" size={12} color={WHATSAPP_COLORS.info} />
                <Text style={[styles.detailChipText, { color: WHATSAPP_COLORS.info }]}>
                  {beautifyName(visit.site.building_status)}
                </Text>
              </View>
            )}

            {/* Floor Condition */}
            {visit.site.floor_condition && (
              <View style={[styles.detailChip, { backgroundColor: WHATSAPP_COLORS.lightPurple }]}>
                <Ionicons name="layers-outline" size={12} color="#7C3AED" />
                <Text style={[styles.detailChipText, { color: "#7C3AED" }]}>
                  {beautifyName(visit.site.floor_condition)}
                </Text>
              </View>
            )}

            {/* Photos Count */}
            {visit.building_photos?.length > 0 && (
              <View style={[styles.detailChip, { backgroundColor: WHATSAPP_COLORS.lightGreen }]}>
                <Ionicons name="camera-outline" size={12} color={WHATSAPP_COLORS.success} />
                <Text style={[styles.detailChipText, { color: WHATSAPP_COLORS.success }]}>
                  {visit.building_photos.length} photos
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Pricing Row */}
          {pricingText && (
            <View style={styles.pricingRow}>
              <View style={styles.pricingBadge}>
                <Ionicons name="cash-outline" size={16} color={WHATSAPP_COLORS.success} />
                <Text style={styles.pricingText}>{pricingText}</Text>
              </View>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  }, [
    selectedVisits,
    selectionMode,
    onVisitPress,
    onVisitSelection,
    onLongPress,
    formatDate,
    getStatusColor,
    getPropertyType,
    beautifyName,
    formatCurrency
  ]);

  // Render Empty State
  const renderEmptyState = useCallback(() => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={WHATSAPP_COLORS.primary} />
          <Text style={styles.loadingText}>Loading visits...</Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyState}>
        <View style={styles.emptyIconContainer}>
          <Ionicons name="business-outline" size={64} color={WHATSAPP_COLORS.textTertiary} />
        </View>
        <Text style={styles.emptyStateTitle}>No visits found</Text>
        <Text style={styles.emptyStateText}>
          Try adjusting your search or filter criteria
        </Text>
      </View>
    );
  }, [loading]);

  return (
    <View style={styles.container}>
      {/* Visits List */}
      <ScrollView
        style={styles.listContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      >
        {visits?.length === 0 ? (
          renderEmptyState()
        ) : (
          <>
            {visits.map((item, index) => renderVisitItem(item, index))}

            {/* Load More */}
            {pagination && pagination.has_next && (
              <TouchableOpacity
                style={styles.loadMoreButton}
                onPress={onLoadMore}
                disabled={loadingMore}
              >
                {loadingMore ? (
                  <ActivityIndicator size="small" color={WHATSAPP_COLORS.primary} />
                ) : (
                  <>
                    <Ionicons name="chevron-down-circle-outline" size={20} color={WHATSAPP_COLORS.primary} />
                    <Text style={styles.loadMoreText}>Load More</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: WHATSAPP_COLORS.background,
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    padding: 16,
  },
  visitCard: {
    backgroundColor: WHATSAPP_COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  visitCardSelected: {
    borderColor: WHATSAPP_COLORS.info,
    backgroundColor: WHATSAPP_COLORS.lightBlue,
  },
  selectionCheckbox: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    zIndex: 10,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: WHATSAPP_COLORS.border,
    backgroundColor: WHATSAPP_COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: WHATSAPP_COLORS.info,
    borderColor: WHATSAPP_COLORS.info,
  },
  cardContent: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  headerLeft: {
    flex: 1,
    marginRight: 12,
  },
  visitName: {
    fontSize: 18,
    fontWeight: '700',
    color: WHATSAPP_COLORS.textPrimary,
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  visitDate: {
    fontSize: 12,
    color: WHATSAPP_COLORS.textTertiary,
    fontWeight: '500',
  },
  propertyTypeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  propertyTypeText: {
    fontSize: 12,
    fontWeight: '700',
    color: WHATSAPP_COLORS.textPrimary,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 6,
  },
  locationText: {
    fontSize: 14,
    color: WHATSAPP_COLORS.textSecondary,
    flex: 1,
    fontWeight: '500',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  detailsScrollContainer: {
    marginBottom: 12,
  },
  detailsGrid: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 16,
  },
  detailChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 5,
  },
  detailChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  pricingRow: {
    marginTop: 4,
  },
  pricingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WHATSAPP_COLORS.lightGreen,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 8,
    alignSelf: 'flex-start',
  },
  pricingText: {
    fontSize: 16,
    color: WHATSAPP_COLORS.success,
    fontWeight: '700',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: WHATSAPP_COLORS.textSecondary,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: WHATSAPP_COLORS.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: WHATSAPP_COLORS.textPrimary,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 15,
    color: WHATSAPP_COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  loadMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
    backgroundColor: WHATSAPP_COLORS.surface,
    borderRadius: 12,
    marginTop: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: WHATSAPP_COLORS.border,
  },
  loadMoreText: {
    fontSize: 15,
    color: WHATSAPP_COLORS.primary,
    fontWeight: '600',
  },
});

export default VisitsList;