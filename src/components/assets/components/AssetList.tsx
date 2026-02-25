
import React from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Platform,
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
  selectedCity?: string;
  isDark?: boolean;
}

export const AssetList: React.FC<AssetListProps> = ({
  assets, loading, refreshing = false, onRefresh,
  onAssetPress, onDeletePress, selectedCity = '', isDark = false,
}) => {
  const T = {
    bg: isDark ? '#050b18' : '#ece5dd',
    card: isDark ? '#111a2d' : '#ffffff',
    text: isDark ? '#ffffff' : '#333333',
    sub: isDark ? '#a0a0a0' : '#666666',
    accent: '#008069',
    border: isDark ? '#1e2a3a' : '#e0e0e0',
    deleteBg: isDark ? '#3a1a1a' : '#fee',
  };

  const getAssetIcon = (assetType: string) => {
    const t = assetType.toLowerCase();
    if (t.includes('laptop') || t.includes('computer')) return 'laptop-outline';
    if (t.includes('printer')) return 'print-outline';
    if (t.includes('monitor') || t.includes('screen')) return 'desktop-outline';
    if (t.includes('phone') || t.includes('mobile')) return 'phone-portrait-outline';
    if (t.includes('tablet')) return 'tablet-portrait-outline';
    if (t.includes('server')) return 'server-outline';
    if (t.includes('router') || t.includes('network')) return 'wifi-outline';
    return 'hardware-chip-outline';
  };

  const renderItem = ({ item }: { item: Asset }) => {
    const location = extractLocation(item.asset_name);
    const baseName = extractAssetBaseName(item.asset_name);
    const serials = item.asset_serial_id ?? [];
    const availableSerials = serials.filter(s => !s.is_assigned);
    const assignedSerials = serials.filter(s => s.is_assigned);
    const hasSerials = serials.length > 0;

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: T.card }]}
        onPress={() => onAssetPress(item)}
        activeOpacity={0.7}
      >
        {/* Icon */}
        <View style={[styles.iconWrap, { backgroundColor: T.accent + '20' }]}>
          <Ionicons name={getAssetIcon(item.asset_type) as any} size={30} color={T.accent} />
        </View>

        <View style={styles.info}>
          {/* Title row */}
          <View style={styles.titleRow}>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
              <Text style={[styles.name, { color: T.text }]} numberOfLines={1}>{baseName}</Text>
              {location && location !== 'Unknown' && (
                <View style={[styles.badge, { backgroundColor: T.accent + '20' }]}>
                  <Ionicons name="location-outline" size={11} color={T.accent} />
                  <Text style={[styles.badgeText, { color: T.accent }]}>{location}</Text>
                </View>
              )}
            </View>
            <TouchableOpacity
              onPress={() => onDeletePress(item)}
              style={[styles.deleteBtn, { backgroundColor: T.deleteBg }]}
            >
              <Ionicons name="trash-outline" size={17} color="#ff4444" />
            </TouchableOpacity>
          </View>

          {/* Type */}
          <View style={styles.metaRow}>
            <Ionicons name="pricetag-outline" size={13} color={T.sub} />
            <Text style={[styles.meta, { color: T.sub }]}>{item.asset_type}</Text>
          </View>

          {/* Serial IDs section */}
          {hasSerials ? (
            <View style={styles.serialsContainer}>
              <View style={styles.serialsHeader}>
                <Ionicons name="barcode-outline" size={13} color={T.sub} />
                <Text style={[styles.meta, { color: T.sub }]}>
                  {serials.length} serial{serials.length !== 1 ? 's' : ''}
                </Text>
                {assignedSerials.length > 0 && (
                  <View style={[styles.badge, { backgroundColor: '#FEF3C7' }]}>
                    <Text style={[styles.badgeText, { color: '#D97706' }]}>
                      {assignedSerials.length} assigned
                    </Text>
                  </View>
                )}
                {availableSerials.length > 0 && (
                  <View style={[styles.badge, { backgroundColor: '#DCFCE7' }]}>
                    <Text style={[styles.badgeText, { color: '#16A34A' }]}>
                      {availableSerials.length} free
                    </Text>
                  </View>
                )}
              </View>
              {/* Show up to 3 serials inline */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 5 }}>
                {serials.slice(0, 3).map(s => (
                  <View key={s.id} style={[
                    styles.serialChip,
                    { backgroundColor: s.is_assigned ? '#FFF7ED' : '#F0F9FF',
                      borderColor: s.is_assigned ? '#FED7AA' : '#BAE6FD' }
                  ]}>
                    <Text style={{
                      fontSize: 11, fontWeight: '600',
                      color: s.is_assigned ? '#C2410C' : '#0369A1',
                      fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
                    }}>
                      {s.serial_id}
                    </Text>
                  </View>
                ))}
                {serials.length > 3 && (
                  <View style={[styles.serialChip, { backgroundColor: T.border, borderColor: T.border }]}>
                    <Text style={{ fontSize: 11, fontWeight: '600', color: T.sub }}>
                      +{serials.length - 3} more
                    </Text>
                  </View>
                )}
              </View>
            </View>
          ) : (
            <View style={styles.metaRow}>
              <Ionicons name="barcode-outline" size={13} color={T.sub} />
              <Text style={[styles.meta, { color: T.sub + '80' }]}>No serials registered</Text>
            </View>
          )}

          {/* Description */}
          {item.asset_description ? (
            <Text style={[styles.desc, { color: T.sub }]} numberOfLines={1}>
              {item.asset_description}
            </Text>
          ) : null}

          {/* Footer */}
          <View style={styles.footer}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Ionicons name="layers-outline" size={14} color={T.accent} />
              <Text style={[styles.meta, { color: T.text }]}>
                Count: <Text style={{ color: T.accent, fontWeight: '700' }}>{item.asset_count}</Text>
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {(item.available_count !== undefined) && (
                <View style={[styles.badge, { backgroundColor: '#DCFCE7' }]}>
                  <Text style={[styles.badgeText, { color: '#16A34A' }]}>
                    {item.available_count} avail
                  </Text>
                </View>
              )}
              {item.created_at && (
                <Text style={[styles.date, { color: T.sub }]}>
                  {new Date(item.created_at).toLocaleDateString()}
                </Text>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && !refreshing && assets.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={T.accent} />
        <Text style={[styles.loadingText, { color: T.sub }]}>Loading assets...</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={assets}
      renderItem={renderItem}
      keyExtractor={item => item.id?.toString() ?? Math.random().toString()}
      contentContainerStyle={[styles.list, assets.length === 0 && { flexGrow: 1 }]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh
          ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[T.accent]} tintColor={T.accent} />
          : undefined
      }
      ListHeaderComponent={assets.length > 0 ? (
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 8, marginBottom: 16 }}>
          {[
            { label: 'Asset Types', value: assets.length },
            { label: 'Total Count', value: assets.reduce((s, a) => s + (a.asset_count || 0), 0) },
            { label: 'Serials Reg.', value: assets.reduce((s, a) => s + (a.asset_serial_id?.length || 0), 0) },
          ].map(stat => (
            <View key={stat.label} style={[styles.statBox, { backgroundColor: isDark ? '#111a2d' : '#fff' }]}>
              <Text style={[styles.statNum, { color: T.accent }]}>{stat.value}</Text>
              <Text style={[styles.statLabel, { color: T.sub }]}>{stat.label}</Text>
            </View>
          ))}
        </View>
      ) : null}
      ListEmptyComponent={!loading ? (
        <View style={styles.center}>
          <View style={[styles.emptyIcon, { backgroundColor: T.accent + '20' }]}>
            <Ionicons name="cube-outline" size={56} color={T.accent} />
          </View>
          <Text style={[styles.emptyTitle, { color: T.text }]}>No Assets Found</Text>
          <Text style={[styles.emptySub, { color: T.sub }]}>
            Tap + to add your first asset
          </Text>
        </View>
      ) : null}
    />
  );
};

const styles = StyleSheet.create({
  list: { padding: 16, paddingBottom: 32 },
  card: {
    flexDirection: 'row', borderRadius: 16, padding: 14,
    marginBottom: 12, shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08,
    shadowRadius: 4, elevation: 3,
  },
  iconWrap: { width: 56, height: 56, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  info: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  name: { fontSize: 16, fontWeight: '700' },
  badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, gap: 3 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  deleteBtn: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 },
  meta: { fontSize: 13 },
  serialsContainer: { marginVertical: 4 },
  serialsHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  serialChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  desc: { fontSize: 12, marginTop: 2, marginBottom: 4 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  date: { fontSize: 11 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  loadingText: { marginTop: 12, fontSize: 15 },
  emptyIcon: { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginBottom: 6 },
  emptySub: { fontSize: 14, textAlign: 'center' },
  statBox: { flex: 1, padding: 14, borderRadius: 14, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 2 },
  statNum: { fontSize: 22, fontWeight: '800', marginBottom: 2 },
  statLabel: { fontSize: 11, fontWeight: '500', textAlign: 'center' },
});