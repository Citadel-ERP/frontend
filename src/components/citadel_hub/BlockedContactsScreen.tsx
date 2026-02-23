import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  FlatList,
  StyleSheet,
  Platform,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';;
import { getAvatarColor } from './avatarColors';

interface BlockedUser {
  room_id: number;
  blocked_at: string | null;
  user: {
    id: number;
    employee_id: string;
    first_name: string;
    last_name: string;
    email: string;
    profile_picture?: string;
  };
}

interface BlockedContactsScreenProps {
  onBack: () => void;
  onUnblock: (roomId: number) => Promise<void>;
  apiCall: (endpoint: string, data: any) => Promise<any>;
}

export const BlockedContactsScreen: React.FC<BlockedContactsScreenProps> = ({
  onBack,
  onUnblock,
  apiCall,
}) => {
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unblockingId, setUnblockingId] = useState<number | null>(null);

  const loadBlockedUsers = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const result = await apiCall('getBlockedUsers', {});
      setBlockedUsers(result.blocked_users || []);
    } catch (error) {
      console.error('❌ Error loading blocked users:', error);
      Alert.alert('Error', 'Could not load blocked contacts.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [apiCall]);

  useEffect(() => {
    loadBlockedUsers();
  }, [loadBlockedUsers]);

  const handleUnblock = (item: BlockedUser) => {
    Alert.alert(
      'Unblock Contact',
      `Unblock ${item.user.first_name} ${item.user.last_name}? They will be able to call you and send messages again.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unblock',
          onPress: async () => {
            setUnblockingId(item.room_id);
            try {
              await onUnblock(item.room_id);
              // Remove from local list immediately for snappy UX
              setBlockedUsers(prev => prev.filter(u => u.room_id !== item.room_id));
            } catch (error) {
              Alert.alert('Error', 'Could not unblock this contact. Please try again.');
            } finally {
              setUnblockingId(null);
            }
          },
        },
      ]
    );
  };

  const formatBlockedDate = (dateStr: string | null): string => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `Blocked ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  };

  const renderItem = ({ item }: { item: BlockedUser }) => {
    const { user } = item;
    const isUnblocking = unblockingId === item.room_id;
    const initials = `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase();
    const colors = getAvatarColor(user.id || user.employee_id);

    return (
      <View style={styles.userItem}>
        {/* Avatar */}
        <View style={styles.avatarWrapper}>
          {user.profile_picture ? (
            <Image source={{ uri: user.profile_picture }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: colors.light }]}>
              <Text style={[styles.avatarText, { color: colors.dark }]}>{initials}</Text>
            </View>
          )}
          {/* Blocked overlay badge */}
          <View style={styles.blockedBadge}>
            <Ionicons name="ban" size={10} color="#ffffff" />
          </View>
        </View>

        {/* Info */}
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{user.first_name} {user.last_name}</Text>
          {item.blocked_at && (
            <Text style={styles.blockedDate}>{formatBlockedDate(item.blocked_at)}</Text>
          )}
        </View>

        {/* Unblock button */}
        <TouchableOpacity
          style={[styles.unblockBtn, isUnblocking && styles.unblockBtnDisabled]}
          onPress={() => !isUnblocking && handleUnblock(item)}
          activeOpacity={0.7}
          disabled={isUnblocking}
        >
          {isUnblocking ? (
            <ActivityIndicator size="small" color="#00a884" />
          ) : (
            <Text style={styles.unblockBtnText}>Unblock</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconCircle}>
        <Ionicons name="shield-checkmark-outline" size={48} color="#00a884" />
      </View>
      <Text style={styles.emptyTitle}>No blocked contacts</Text>
      <Text style={styles.emptySubtitle}>
        People you block won't be able to send you messages or call you.
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <View style={styles.headerTitleGroup}>
          <Text style={styles.headerTitle}>Blocked contacts</Text>
          {!loading && (
            <Text style={styles.headerSubtitle}>
              {blockedUsers.length} {blockedUsers.length === 1 ? 'contact' : 'contacts'}
            </Text>
          )}
        </View>
      </View>

      {/* Body */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00a884" />
        </View>
      ) : (
        <FlatList
          data={blockedUsers}
          renderItem={renderItem}
          keyExtractor={item => item.room_id.toString()}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={blockedUsers.length === 0 ? styles.emptyListContent : undefined}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadBlockedUsers(true)}
              colors={['#00a884']}
              tintColor="#00a884"
            />
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}

      {/* Info footer */}
      {!loading && blockedUsers.length > 0 && (
        <View style={styles.footer}>
          <Ionicons name="information-circle-outline" size={16} color="#8696a0" />
          <Text style={styles.footerText}>
            Tap "Unblock" to allow a contact to message or call you again.
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f5' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#008069',
    paddingTop: 90,
    paddingBottom: 16,
    paddingHorizontal: 16,
    gap: 12,
    marginTop: Platform.OS === 'ios' ? -80 : -50,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitleGroup: { flex: 1 },
  headerTitle: { fontSize: 19, color: '#ffffff', fontWeight: '600' },
  headerSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyListContent: { flexGrow: 1, justifyContent: 'center' },
  emptyContainer: { alignItems: 'center', paddingHorizontal: 40, paddingVertical: 60 },
  emptyIconCircle: { width: 96, height: 96, borderRadius: 48, backgroundColor: 'rgba(0,168,132,0.12)', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  emptyTitle: { fontSize: 20, fontWeight: '600', color: '#111b21', marginBottom: 8, textAlign: 'center' },
  emptySubtitle: { fontSize: 14, color: '#8696a0', textAlign: 'center', lineHeight: 20 },
  userItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  avatarWrapper: { position: 'relative' },
  avatar: { width: 50, height: 50, borderRadius: 25 },
  avatarPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 18, fontWeight: '600' },
  blockedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#f15c6d',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  userInfo: { flex: 1 },
  userName: { fontSize: 16, fontWeight: '500', color: '#111b21', marginBottom: 2 },
  blockedDate: { fontSize: 13, color: '#8696a0' },
  unblockBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#00a884',
    minWidth: 80,
    alignItems: 'center',
  },
  unblockBtnDisabled: { borderColor: '#c5c5c5' },
  unblockBtnText: { fontSize: 14, color: '#00a884', fontWeight: '600' },
  separator: { height: 1, backgroundColor: '#e9edef', marginLeft: 78 },
  footer: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 16, backgroundColor: '#ffffff', borderTopWidth: 1, borderTopColor: '#e9edef' },
  footerText: { flex: 1, fontSize: 13, color: '#8696a0', lineHeight: 18 },
});