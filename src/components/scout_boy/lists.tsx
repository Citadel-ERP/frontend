import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  FlatList,
  Image,
} from 'react-native';
import { ThemeColors, Visit } from './types';
import { Ionicons } from '@expo/vector-icons';

const WHATSAPP_COLORS = {
  primary: '#075E54',
  primaryLight: '#128C7E',
  primaryDark: '#054D44',
  secondary: '#25D366',
  accent: '#10B981',
  danger: '#EF4444',
  warning: '#F59E0B',
  background: '#e7e6e5',
  surface: '#FFFFFF',
  textPrimary: '#1F2937',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  border: '#E5E7EB',
  success: '#25D366',
  info: '#3B82F6',
  white: '#FFFFFF',
  chatBg: '#ECE5DD',
  incoming: '#FFFFFF',
  outgoing: '#DCF8C6',
};

interface VisitsListProps {
  visits: Visit[];
  onVisitPress: (visit: Visit, index: number) => void;
  loading: boolean;
  loadingMore: boolean;
  refreshing: boolean;
  onLoadMore: () => void;
  onRefresh: () => void;
  token: string | null;
  theme: ThemeColors;
  isDarkMode: boolean;
}

const avatarColors = ['#00d285', '#ff5e7a', '#ffb157', '#1da1f2', '#007AFF'];

const beautifyName = (name: string): string => {
  if (!name) return '';
  return name
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

const getInitials = (name: string): string => {
  if (!name || name.trim().length === 0) return '?';
  const nameParts = name.trim().split(/\s+/);
  if (nameParts.length === 1) {
    return nameParts[0].charAt(0).toUpperCase();
  } else {
    return (nameParts[0].charAt(0) + nameParts[1].charAt(0)).toUpperCase();
  }
};

const getAvatarColor = (name: string): string => {
  if (!name) return avatarColors[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % avatarColors.length;
  return avatarColors[index];
};

const formatDateTime = (dateString?: string): string => {
  if (!dateString) return '-';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return '-';
  
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 60) {
    return `${diffMins}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else if (diffDays < 7) {
    return `${diffDays}d ago`;
  } else {
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short'
    });
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'scout_completed':
    case 'admin_completed':
      return { icon: 'checkmark-circle', color: WHATSAPP_COLORS.success };
    case 'pending':
      return { icon: 'time', color: WHATSAPP_COLORS.warning };
    case 'cancelled':
      return { icon: 'close-circle', color: WHATSAPP_COLORS.danger };
    default:
      return { icon: 'help-circle', color: WHATSAPP_COLORS.textTertiary };
  }
};

const VisitsList: React.FC<VisitsListProps> = React.memo(({
  visits,
  onVisitPress,
  loading,
  loadingMore,
  refreshing,
  onLoadMore,
  onRefresh,
  theme,
  isDarkMode,
}) => {
  const renderVisitItem = useCallback(({ item: visit, index }: { item: Visit; index: number }) => {
    const buildingName = visit.site?.building_name || 'Unnamed Building';
    const avatarColor = getAvatarColor(buildingName);
    const initials = getInitials(buildingName);
    const lastUpdated = formatDateTime(visit.updated_at);
    const statusIcon = getStatusIcon(visit.status);
    const isManaged = visit.site?.managed_property === true;
    
    const pricingText = isManaged && visit.site?.rent_per_seat 
      ? `₹${visit.site.rent_per_seat}/seat`
      : visit.site?.rent && visit.site?.total_area 
        ? `₹${(parseFloat(visit.site.rent) / parseFloat(visit.site.total_area)).toFixed(2)}/sq-ft`
        : '';

    return (
      <TouchableOpacity 
        style={styles.visitItem} 
        onPress={() => onVisitPress(visit, index)}
        activeOpacity={0.7}
      >
        <View style={[styles.visitAvatar, { backgroundColor: avatarColor }]}>
          {visit.photos?.length > 0 ? (
            <Image
              source={{ uri: visit.photos[0].file_url }}
              style={styles.visitImage}
            />
          ) : (
            <Text style={styles.visitAvatarText}>{initials}</Text>
          )}
          {visit.photos?.length > 0 && (
            <View style={styles.photoCountBadge}>
              <Text style={styles.photoCountText}>{visit.photos.length}</Text>
            </View>
          )}
        </View>
        
        <View style={styles.visitContent}>
          <View style={styles.visitHeader}>
            <Text style={styles.visitName} numberOfLines={1}>
              {buildingName}
            </Text>
            <Text style={styles.visitTime}>{lastUpdated}</Text>
          </View>
          
          <View style={styles.visitMessage}>
            <Text style={styles.visitMessageText} numberOfLines={1}>
              {visit.site?.location || 'No location specified'}
            </Text>
            <Ionicons 
              name={statusIcon.icon as any} 
              size={16} 
              color={statusIcon.color} 
            />
          </View>
          
          <View style={styles.visitStatus}>
            <Text style={styles.visitStatusText}>
              {isManaged ? '💼 Managed' : '🏛️ Conventional'} • {beautifyName(visit.status)}
            </Text>
          </View>
          
          {pricingText && (
            <View style={styles.visitContact}>
              <Ionicons name="cash" size={12} color={WHATSAPP_COLORS.textTertiary} />
              <Text style={styles.visitContactText} numberOfLines={1}>
                {pricingText}
              </Text>
            </View>
          )}
        </View>
        
        <View style={styles.visitArrow}>
          <Ionicons name="chevron-forward" size={20} color={WHATSAPP_COLORS.textTertiary} />
        </View>
      </TouchableOpacity>
    );
  }, [onVisitPress]);

  const keyExtractor = useCallback((item: Visit) => item.id.toString(), []);

  const refreshControl = useMemo(() => (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      colors={[WHATSAPP_COLORS.primary]}
      tintColor={WHATSAPP_COLORS.primary}
    />
  ), [refreshing, onRefresh]);

  const listFooter = useMemo(() => {
    if (!loadingMore) return null;
    return (
      <View style={styles.loadMoreContainer}>
        <ActivityIndicator size="small" color={WHATSAPP_COLORS.primary} />
      </View>
    );
  }, [loadingMore]);

  if (loading && visits.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={WHATSAPP_COLORS.primary} />
        <Text style={styles.loadingText}>Loading visits...</Text>
      </View>
    );
  }

  if (visits.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Ionicons name="business" size={64} color={WHATSAPP_COLORS.border} />
        <Text style={styles.emptyStateText}>No visits found</Text>
        <Text style={styles.emptyStateSubtext}>
          Your assigned visits will appear here
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={visits}
      renderItem={renderVisitItem}
      keyExtractor={keyExtractor}
      showsVerticalScrollIndicator={false}
      onEndReached={onLoadMore}
      onEndReachedThreshold={0.1}
      refreshControl={refreshControl}
      contentContainerStyle={styles.listContainer}
      ListFooterComponent={listFooter}
      removeClippedSubviews={true}
      maxToRenderPerBatch={10}
      updateCellsBatchingPeriod={50}
      initialNumToRender={10}
      windowSize={10}
    />
  );
});

VisitsList.displayName = 'VisitsList';

const styles = StyleSheet.create({
  listContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  visitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WHATSAPP_COLORS.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  visitAvatar: {
    width: 56,
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  visitImage: {
    width: '100%',
    height: '100%',
  },
  visitAvatarText: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  photoCountBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  photoCountText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '600',
  },
  visitContent: {
    flex: 1,
  },
  visitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  visitName: {
    fontSize: 16,
    fontWeight: '600',
    color: WHATSAPP_COLORS.textPrimary,
    flex: 1,
    marginRight: 8,
  },
  visitTime: {
    fontSize: 12,
    color: WHATSAPP_COLORS.textTertiary,
  },
  visitMessage: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  visitMessageText: {
    fontSize: 14,
    color: WHATSAPP_COLORS.textSecondary,
    flex: 1,
    marginRight: 8,
  },
  visitStatus: {
    marginBottom: 4,
  },
  visitStatusText: {
    fontSize: 12,
    color: WHATSAPP_COLORS.primary,
    fontWeight: '500',
  },
  visitContact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  visitContactText: {
    fontSize: 12,
    color: WHATSAPP_COLORS.textTertiary,
    flex: 1,
  },
  visitArrow: {
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 50,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: WHATSAPP_COLORS.textSecondary,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: WHATSAPP_COLORS.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: WHATSAPP_COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  loadMoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
});

export default VisitsList;