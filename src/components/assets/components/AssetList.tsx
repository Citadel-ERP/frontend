import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Asset } from '../types/asset.types';
import { extractLocation, extractAssetBaseName } from '../utils/validators';

interface AssetListProps {
  assets: Asset[];
  loading: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  onAssetPress: (asset: Asset) => void;
  onDeletePress: (asset: Asset) => void;
  onFilterPress?: () => void;
  selectedCity?: string;
  isDark?: boolean;
}

export const AssetList: React.FC<AssetListProps> = ({
  assets,
  loading,
  refreshing = false,
  onRefresh,
  onAssetPress,
  onDeletePress,
  onFilterPress,
  selectedCity = '',
  isDark = false,
}) => {
  const theme = {
    bgColor: isDark ? '#050b18' : '#ece5dd',
    cardBg: isDark ? '#111a2d' : '#ffffff',
    textMain: isDark ? '#ffffff' : '#333333',
    textSub: isDark ? '#a0a0a0' : '#666666',
    accentBlue: '#008069',
    borderColor: isDark ? '#1e2a3a' : '#e0e0e0',
    deleteBg: isDark ? '#3a1a1a' : '#fee',
  };

  const getAssetIcon = (assetType: string) => {
    const type = assetType.toLowerCase();
    if (type.includes('laptop') || type.includes('computer')) return 'laptop-outline';
    if (type.includes('printer')) return 'print-outline';
    if (type.includes('monitor') || type.includes('screen')) return 'desktop-outline';
    if (type.includes('phone') || type.includes('mobile')) return 'phone-portrait-outline';
    if (type.includes('tablet')) return 'tablet-portrait-outline';
    if (type.includes('server')) return 'server-outline';
    if (type.includes('network') || type.includes('router')) return 'wifi-outline';
    return 'hardware-chip-outline';
  };

  const renderAssetItem = ({ item }: { item: Asset }) => {
    const location = extractLocation(item.asset_name);
    const baseName = extractAssetBaseName(item.asset_name);
    const iconName = getAssetIcon(item.asset_type);

    return (
      <TouchableOpacity
        style={[styles.assetCard, { backgroundColor: theme.cardBg }]}
        onPress={() => onAssetPress(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.assetIcon, { backgroundColor: theme.accentBlue + '20' }]}>
          <Ionicons name={iconName as any} size={32} color={theme.accentBlue} />
        </View>

        <View style={styles.assetInfo}>
          <View style={styles.assetHeader}>
            <View style={styles.titleContainer}>
              <Text style={[styles.assetName, { color: theme.textMain }]} numberOfLines={1}>
                {baseName}
              </Text>
              <View style={[styles.locationBadge, { backgroundColor: theme.accentBlue + '20' }]}>
                <Ionicons name="location-outline" size={12} color={theme.accentBlue} />
                <Text style={[styles.locationText, { color: theme.accentBlue }]}>
                  {location}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => onDeletePress(item)}
              style={[styles.deleteButton, { backgroundColor: theme.deleteBg }]}
            >
              <Ionicons name="trash-outline" size={18} color="#ff4444" />
            </TouchableOpacity>
          </View>

          <View style={styles.typeContainer}>
            <Ionicons name="pricetag-outline" size={14} color={theme.textSub} />
            <Text style={[styles.assetType, { color: theme.textSub }]}>
              {item.asset_type}
            </Text>
          </View>

          {item.asset_description ? (
            <View style={styles.descriptionContainer}>
              <Ionicons name="document-text-outline" size={14} color={theme.textSub} />
              <Text style={[styles.assetDescription, { color: theme.textSub }]} numberOfLines={2}>
                {item.asset_description}
              </Text>
            </View>
          ) : null}

          <View style={styles.assetFooter}>
            <View style={styles.countContainer}>
              <Ionicons name="layers-outline" size={16} color={theme.accentBlue} />
              <Text style={[styles.assetCount, { color: theme.textMain }]}>
                Count: <Text style={[styles.countNumber, { color: theme.accentBlue }]}>{item.asset_count}</Text>
              </Text>
            </View>

            {item.created_at && (
              <View style={styles.dateContainer}>
                <Ionicons name="time-outline" size={12} color={theme.textSub} />
                <Text style={[styles.dateText, { color: theme.textSub }]}>
                  {new Date(item.created_at).toLocaleDateString()}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.centerContainer}>
      <View style={[styles.emptyIconContainer, { backgroundColor: theme.accentBlue + '20' }]}>
        <Ionicons name="cube-outline" size={64} color={theme.accentBlue} />
      </View>
      <Text style={[styles.emptyText, { color: theme.textMain }]}>
        No Assets Found
      </Text>
      <Text style={[styles.emptySubText, { color: theme.textSub }]}>
        Click the + button to add your first asset or upload an Excel file
      </Text>
    </View>
  );

  const renderLoadingState = () => (
    <View style={styles.centerContainer}>
      <ActivityIndicator size="large" color={theme.accentBlue} />
      <Text style={[styles.loadingText, { color: theme.textSub }]}>
        Loading assets...
      </Text>
    </View>
  );

  const renderError = () => (
    <View style={styles.centerContainer}>
      <View style={[styles.errorIconContainer, { backgroundColor: theme.deleteBg }]}>
        <Ionicons name="alert-circle-outline" size={64} color="#ff4444" />
      </View>
      <Text style={[styles.errorText, { color: theme.textMain }]}>
        Failed to load assets
      </Text>
      <TouchableOpacity
        style={[styles.retryButton, { backgroundColor: theme.accentBlue }]}
        onPress={onRefresh}
      >
        <Text style={styles.retryButtonText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading && !refreshing && assets.length === 0) {
    return renderLoadingState();
  }

  const renderListHeader = () => {
    if (assets.length === 0) return null;

    return (
      <View>
        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statsContainer}>
            <View style={[styles.statBox, { backgroundColor: theme.cardBg }]}>
              <Text style={[styles.statNumber, { color: theme.accentBlue }]}>
                {assets.length}
              </Text>
              <Text style={[styles.statLabel, { color: theme.textSub }]}>
                Total Assets
              </Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: theme.cardBg }]}>
              <Text style={[styles.statNumber, { color: theme.accentBlue }]}>
                {assets.reduce((sum, asset) => sum + (asset.asset_count || 0), 0)}
              </Text>
              <Text style={[styles.statLabel, { color: theme.textSub }]}>
                Total Count
              </Text>
            </View>
          </View>

          {/* Filter Icon Button */}
          <TouchableOpacity
            onPress={onFilterPress}
            style={[
              styles.filterButton,
              {
                backgroundColor: selectedCity ? theme.accentBlue : theme.cardBg,
                borderColor: theme.accentBlue,
              },
            ]}
          >
            <Ionicons
              name="filter-outline"
              size={20}
              color={selectedCity ? '#ffffff' : theme.accentBlue}
            />
            {selectedCity ? (
              <Text style={styles.filterActiveText} numberOfLines={1}>
                {selectedCity}
              </Text>
            ) : null}
          </TouchableOpacity>
        </View>

        {/* Active Filter Badge */}
        {selectedCity ? (
          <View style={[styles.activeFilterBanner, { backgroundColor: theme.accentBlue + '15', borderColor: theme.accentBlue + '40' }]}>
            <Ionicons name="location-outline" size={14} color={theme.accentBlue} />
            <Text style={[styles.activeFilterText, { color: theme.accentBlue }]}>
              Filtered by: <Text style={{ fontWeight: '700' }}>{selectedCity}</Text>
            </Text>
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <FlatList
      data={assets}
      renderItem={renderAssetItem}
      keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
      contentContainerStyle={[
        styles.listContainer,
        assets.length === 0 && styles.emptyListContainer,
      ]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.accentBlue]}
            tintColor={theme.accentBlue}
            title="Pull to refresh"
            titleColor={theme.textSub}
          />
        ) : undefined
      }
      ListEmptyComponent={!loading ? renderEmptyState : null}
      ListHeaderComponent={renderListHeader}
      stickyHeaderIndices={assets.length > 0 ? [0] : undefined}
    />
  );
};

const styles = StyleSheet.create({
  listContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  emptyListContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  statsContainer: {
    flex: 1,
    flexDirection: 'row',
    gap: 12,
  },
  statBox: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1.5,
    gap: 4,
    minWidth: 48,
    alignSelf: 'stretch',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  filterActiveText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    maxWidth: 70,
  },
  activeFilterBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  activeFilterText: {
    fontSize: 13,
  },
  assetCard: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  assetIcon: {
    width: 60,
    height: 60,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  assetInfo: {
    flex: 1,
  },
  assetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  titleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  assetName: {
    fontSize: 18,
    fontWeight: '600',
    maxWidth: '60%',
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 4,
  },
  locationText: {
    fontSize: 12,
    fontWeight: '500',
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  typeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 6,
  },
  assetType: {
    fontSize: 14,
    flex: 1,
  },
  descriptionContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 6,
  },
  assetDescription: {
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  assetFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  countContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  assetCount: {
    fontSize: 14,
    fontWeight: '500',
  },
  countNumber: {
    fontSize: 16,
    fontWeight: '700',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: 11,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubText: {
    fontSize: 14,
    textAlign: 'center',
    maxWidth: 250,
    lineHeight: 20,
  },
  errorIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
});