import React, { useState, useEffect } from 'react';
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
  onCreateGroup: () => void; // NEW: Navigation to group creation
  apiCall: (endpoint: string, data: any) => Promise<any>;
}

export const NewChat: React.FC<NewChatProps> = ({
  currentUser,
  onBack,
  onCreate,
  onCreateGroup, // NEW
  apiCall,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    searchUsers();
  }, [searchQuery]);

  const searchUsers = async () => {
    setIsSearching(true);
    try {
      const result = await apiCall('searchUsers', { search: searchQuery });
      if (result.users) {
        setUsers(result.users);
      }
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleUserSelect = (user: User) => {
    onCreate(user.employee_id);
  };

  const clearSearch = () => {
    setSearchQuery('');
  };

  const renderUser = ({ item: user }: { item: User }) => (
    <TouchableOpacity
      style={styles.contactItem}
      onPress={() => handleUserSelect(user)}
      activeOpacity={0.7}
    >
      <View style={styles.contactAvatar}>
        {user.profile_picture ? (
          <Image
            source={{ uri: user.profile_picture }}
            style={styles.contactAvatarImage}
          />
        ) : (
          <View style={styles.contactAvatarPlaceholder}>
            <Text style={styles.contactAvatarText}>
              {user.first_name?.[0]}{user.last_name?.[0] || ''}
            </Text>
          </View>
        )}
      </View>
      <View style={styles.contactInfo}>
        <Text style={styles.contactName}>
          {user.first_name} {user.last_name}
        </Text>
        <Text style={styles.contactStatus} numberOfLines={1}>
          {user.email}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Select contact</Text>
        <TouchableOpacity style={styles.headerIconBtn} activeOpacity={0.7}>
          <Ionicons name="search" size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* Scrollable content */}
      <ScrollView 
        style={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
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
              <TouchableOpacity
                onPress={clearSearch}
                style={styles.clearButton}
                activeOpacity={0.7}
              >
                <Ionicons name="close-circle" size={20} color="#8696a0" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.actionsSection}>
          <TouchableOpacity 
            style={styles.actionItem} 
            activeOpacity={0.7}
            onPress={onCreateGroup} // NEW: Navigate to group creation
          >
            <View style={[styles.actionIcon, { backgroundColor: '#00a884' }]}>
              <Ionicons name="people" size={24} color="#ffffff" />
            </View>
            <Text style={styles.actionTitle}>New group</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.contactsSection}>
          <Text style={styles.sectionTitle}>Contacts on Citadel</Text>
          
          {isSearching ? (
            <View style={styles.loadingState}>
              <ActivityIndicator size="large" color="#00a884" />
              <Text style={styles.loadingText}>Searching...</Text>
            </View>
          ) : users.length > 0 ? (
            <View>
              {users.map((user) => (
                <View key={user.employee_id}>
                  {renderUser({ item: user })}
                </View>
              ))}
            </View>
          ) : searchQuery ? (
            <View style={styles.emptyState}>
              <Ionicons name="search" size={48} color="#e9edef" />
              <Text style={styles.emptyText}>No contacts found</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#008069',
    paddingTop: 40,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 19,
    color: '#ffffff',
    fontWeight: '500',
    marginLeft: 16,
  },
  headerIconBtn: {
    padding: 8,
  },
  scrollContent: {
    flex: 1,
  },
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
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#111b21',
    paddingVertical: 2,
  },
  clearButton: {
    padding: 4,
    marginLeft: 4,
  },
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
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111b21',
  },
  contactsSection: {
    paddingBottom: 20,
  },
  sectionTitle: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: '#667781',
    fontWeight: '500',
    backgroundColor: '#f0f2f5',
  },
  loadingState: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#667781',
  },
  emptyState: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
    color: '#667781',
  },
  contactsList: {
    flex: 1,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    backgroundColor: '#ffffff',
  },
  contactAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
  },
  contactAvatarImage: {
    width: '100%',
    height: '100%',
  },
  contactAvatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#e9edef',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactAvatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8696a0',
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111b21',
    marginBottom: 2,
  },
  contactStatus: {
    fontSize: 14,
    color: '#667781',
  },
});