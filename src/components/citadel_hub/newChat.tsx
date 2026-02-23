import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface User {
  id: number;
  employee_id: string;
  first_name: string;
  last_name: string;
  email: string;
  profile_picture?: string;
}

interface NewChatProps {
  currentUser: User;
  onBack: () => void;
  onCreate: (employeeId: string) => void;
  onCreateGroup: () => void;
  apiCall: (endpoint: string, data: any) => Promise<any>;
}

const PAGE_SIZE = 50;

export const NewChat: React.FC<NewChatProps> = ({
  currentUser,
  onBack,
  onCreate,
  onCreateGroup,
  apiCall,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);

  // Keep a ref to the latest query so async callbacks can guard against stale results
  const latestQueryRef = useRef('');

  const fetchUsers = useCallback(
    async (query: string, nextOffset: number, append: boolean) => {
      if (nextOffset === 0) {
        setIsSearching(true);
      } else {
        setIsLoadingMore(true);
      }

      try {
        const result = await apiCall('searchUsers', {
          search: query,
          offset: nextOffset,
          limit: PAGE_SIZE,
        });

        // Discard if a newer search has already started
        if (latestQueryRef.current !== query) return;

        if (result.users) {
          setUsers(prev => (append ? [...prev, ...result.users] : result.users));
          setHasMore(result.has_more ?? false);
          setOffset(nextOffset + result.users.length);
        }
      } catch (error) {
        console.error('Error searching users:', error);
      } finally {
        if (nextOffset === 0) setIsSearching(false);
        else setIsLoadingMore(false);
      }
    },
    [apiCall],
  );

  // Debounce search so we don't hammer the API on every keystroke
  useEffect(() => {
    latestQueryRef.current = searchQuery;
    setOffset(0);
    setHasMore(false);

    const timer = setTimeout(() => {
      fetchUsers(searchQuery, 0, false);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleLoadMore = () => {
    if (!isLoadingMore && hasMore) {
      fetchUsers(searchQuery, offset, true);
    }
  };

  const handleUserSelect = (user: User) => onCreate(user.employee_id);

  const clearSearch = () => setSearchQuery('');

  const renderUser = ({ item: user }: { item: User }) => (
    <TouchableOpacity
      style={styles.contactItem}
      onPress={() => handleUserSelect(user)}
      activeOpacity={0.7}
    >
      <View style={styles.contactAvatar}>
        {user.profile_picture ? (
          <Image source={{ uri: user.profile_picture }} style={styles.contactAvatarImage} />
        ) : (
          <View style={styles.contactAvatarPlaceholder}>
            <Text style={styles.contactAvatarText}>
              {user.first_name?.[0]}{user.last_name?.[0] || ''}
            </Text>
          </View>
        )}
      </View>
      <View style={styles.contactInfo}>
        <Text style={styles.contactName}>{user.first_name} {user.last_name}</Text>
        <Text style={styles.contactStatus} numberOfLines={1}>{user.email}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderFooter = () => {
    if (!hasMore && !isLoadingMore) return null;

    if (isLoadingMore) {
      return (
        <View style={styles.loadMoreContainer}>
          <ActivityIndicator size="small" color="#00a884" />
        </View>
      );
    }

    return (
      <TouchableOpacity style={styles.loadMoreButton} onPress={handleLoadMore} activeOpacity={0.7}>
        <Text style={styles.loadMoreText}>Load more</Text>
        <Ionicons name="chevron-down" size={16} color="#00a884" />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Select contact</Text>
        <View style={styles.headerIconBtn} />
      </View>

      {/* Search bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color="#8696a0" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search contacts"
            placeholderTextColor="#8696a0"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={clearSearch} style={styles.clearButton} activeOpacity={0.7}>
              <Ionicons name="close-circle" size={20} color="#8696a0" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* New Group shortcut */}
      <View style={styles.actionsSection}>
        <TouchableOpacity style={styles.actionItem} activeOpacity={0.7} onPress={onCreateGroup}>
          <View style={[styles.actionIcon, { backgroundColor: '#00a884' }]}>
            <Ionicons name="people" size={24} color="#ffffff" />
          </View>
          <Text style={styles.actionTitle}>New group</Text>
        </TouchableOpacity>
      </View>

      {/* Contacts list */}
      <View style={styles.contactsSection}>
        <Text style={styles.sectionTitle}>Contacts on Citadel</Text>

        {isSearching ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color="#00a884" />
            <Text style={styles.loadingText}>Searching...</Text>
          </View>
        ) : users.length > 0 ? (
          <FlatList
            data={users}
            renderItem={renderUser}
            keyExtractor={item => String(item.employee_id)}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.3}
            ListFooterComponent={renderFooter}
            keyboardShouldPersistTaps="handled"
          />
        ) : searchQuery && !isSearching ? (
          <View style={styles.emptyState}>
            <Ionicons name="search" size={48} color="#e9edef" />
            <Text style={styles.emptyText}>No contacts found</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#008069',
    paddingTop: 90,
    paddingBottom: 16,
    paddingHorizontal: 16,
    marginTop: Platform.OS === 'ios' ? -80 : -50,
  },
  backButton: { padding: 8 },
  headerTitle: { flex: 1, fontSize: 19, color: '#ffffff', fontWeight: '500', marginLeft: 16 },
  headerIconBtn: { width: 40 },
  searchContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9edef',
    backgroundColor: '#ffffff',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f2f5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, color: '#111b21', paddingVertical: 2 },
  clearButton: { padding: 4, marginLeft: 4 },
  actionsSection: {
    paddingVertical: 8,
    borderBottomWidth: 8,
    borderBottomColor: '#f0f2f5',
    backgroundColor: '#ffffff',
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 16,
  },
  actionIcon: {
    width: 48, height: 48, borderRadius: 24,
    justifyContent: 'center', alignItems: 'center',
  },
  actionTitle: { fontSize: 16, fontWeight: '500', color: '#111b21' },
  contactsSection: { flex: 1 },
  sectionTitle: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: '#667781',
    fontWeight: '500',
    backgroundColor: '#f0f2f5',
  },
  loadingState: { justifyContent: 'center', alignItems: 'center', paddingVertical: 32 },
  loadingText: { marginTop: 12, fontSize: 14, color: '#667781' },
  emptyState: { justifyContent: 'center', alignItems: 'center', paddingVertical: 32 },
  emptyText: { marginTop: 12, fontSize: 14, color: '#667781' },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    backgroundColor: '#ffffff',
  },
  contactAvatar: { width: 48, height: 48, borderRadius: 24, overflow: 'hidden' },
  contactAvatarImage: { width: '100%', height: '100%' },
  contactAvatarPlaceholder: {
    width: '100%', height: '100%',
    backgroundColor: '#e9edef', justifyContent: 'center', alignItems: 'center',
  },
  contactAvatarText: { fontSize: 16, fontWeight: '600', color: '#8696a0' },
  contactInfo: { flex: 1 },
  contactName: { fontSize: 16, fontWeight: '500', color: '#111b21', marginBottom: 2 },
  contactStatus: { fontSize: 14, color: '#667781' },
  loadMoreContainer: { paddingVertical: 16, alignItems: 'center' },
  loadMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 6,
  },
  loadMoreText: { fontSize: 14, color: '#00a884', fontWeight: '500' },
});