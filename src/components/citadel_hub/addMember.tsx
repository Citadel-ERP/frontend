// citadel_hub/AddMember.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
  StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { User, ChatRoom } from './CitadelHub';
import { getAvatarColor } from './avatarColors';


// ✅ UPDATED: Match props passed from CitadelHub
interface AddMemberProps {
  chatRoom: ChatRoom; // ✅ CHANGED: Receive full ChatRoom instead of currentMembers + groupId
  currentUser: User;
  onBack: () => void;
  onMembersAdded: () => Promise<void>; // ✅ CHANGED: Renamed from onAddMembers
  onOptimisticAdd: (newMember: User) => void; // ✅ NEW: For optimistic updates
  apiCall: (endpoint: string, data: any) => Promise<any>;
  wsRef: React.MutableRefObject<WebSocket | null>; // ✅ NEW: WebSocket ref passed from parent
}

// ✅ Helper to extract user from member object
const getUserFromMember = (member: User | any): User | null => {
  if (!member) return null;

  if ('first_name' in member && 'last_name' in member && 'email' in member) {
    return member as User;
  }

  if ('user' in member && member.user) {
    return member.user;
  }

  return null;
};

export const AddMember: React.FC<AddMemberProps> = ({
  chatRoom, // ✅ CHANGED
  currentUser,
  onBack,
  onMembersAdded, // ✅ CHANGED
  onOptimisticAdd, // ✅ NEW
  apiCall,
  wsRef
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  // ✅ NEW: WebSocket ref (will be passed from parent)
  // const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const result = await apiCall('searchUsers', {});
      
      // ✅ FIXED: Support both 'users' and 'employees' field names
      if (result.users || result.employees) {
        const users = result.users || result.employees;
        
        // ✅ UPDATED: Extract current members from chatRoom
        const currentMemberIds = new Set(
          chatRoom.members.map(m => {
            const user = getUserFromMember(m);
            return user?.employee_id || user?.id?.toString();
          }).filter(Boolean)
        );
        const currentUserId = currentUser.employee_id || currentUser.id?.toString();
        
        const availableUsers = users.filter((user: User) => {
          const userId = user.employee_id || user.id?.toString();
          return userId !== currentUserId && !currentMemberIds.has(userId);
        });
        
        setAllUsers(availableUsers);
      }
    } catch (error) {
      console.error('Error loading users:', error);
      Alert.alert('Error', 'Failed to load users. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getFilteredUsers = () => {
    if (!searchQuery.trim()) {
      return allUsers;
    }

    const query = searchQuery.toLowerCase();
    return allUsers.filter(user => {
      const fullName = `${user.first_name} ${user.last_name}`.toLowerCase();
      const email = user.email?.toLowerCase() || '';
      const designation = user.designation?.toLowerCase() || '';
      
      return fullName.includes(query) || 
             email.includes(query) || 
             designation.includes(query);
    });
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  // ✅ UPDATED: Handle member addition with WebSocket broadcast
  const handleAddMembers = async () => {
    if (selectedUsers.size === 0) {
      Alert.alert('No Selection', 'Please select at least one member to add.');
      return;
    }

    try {
      setAdding(true);
      const selectedUserIds = Array.from(selectedUsers);
      
      console.log(`📤 Adding ${selectedUserIds.length} members to group ${chatRoom.id}`);

      // ✅ Add members sequentially
      for (const userId of selectedUserIds) {
        try {
          const result = await apiCall('addMember', {
            chat_room_id: chatRoom.id,
            user_id: userId,
          });

          if (result.new_member) {
            console.log(`✅ Member added via API: ${result.new_member.first_name}`);

            // ✅ STEP 1: Optimistic UI update
            onOptimisticAdd(result.new_member);

            if (wsRef.current?.readyState === WebSocket.OPEN) {
              console.log(`📢 Broadcasting member addition for ${result.new_member.first_name}`);
              
              wsRef.current.send(JSON.stringify({
                action: 'broadcast_member_added',
                room_id: result.room_id,
                new_member: result.new_member,
                added_by: result.added_by,
                system_message: result.system_message,
              }));

              console.log('✅ Broadcast sent successfully');
            } else {
              console.warn('⚠️ WebSocket not open, members may not receive realtime update');
            }
          }
        } catch (memberError) {
          console.error(`❌ Error adding member ${userId}:`, memberError);
          Alert.alert('Partial Success', `Some members could not be added. Please try again.`);
        }
      }

      // ✅ STEP 3: Trigger backend refresh (debounced in parent)
      console.log('📡 Triggering backend refresh via onMembersAdded');
      await onMembersAdded();

      // ✅ STEP 4: Navigate back
      Alert.alert(
        'Success', 
        `${selectedUserIds.length} member${selectedUserIds.length > 1 ? 's' : ''} added successfully`,
        [{ text: 'OK', onPress: onBack }]
      );

    } catch (error) {
      console.error('❌ Error in handleAddMembers:', error);
      Alert.alert('Error', 'Failed to add members. Please try again.');
    } finally {
      setAdding(false);
    }
  };

  const renderUserItem = ({ item }: { item: User }) => {
    const userId = item.employee_id || item.id?.toString() || '';
    const isSelected = selectedUsers.has(userId);
    const fullName = `${item.first_name} ${item.last_name}`;
    
    // ✅ ADD THIS - Generate colors
    const colors = getAvatarColor(userId);

    return (
      <TouchableOpacity
        style={styles.userItem}
        onPress={() => toggleUserSelection(userId)}
        activeOpacity={0.7}
      >
        <View style={styles.userInfo}>
          {item.profile_picture ? (
            <Image
              source={{ uri: item.profile_picture }}
              style={styles.avatar}
            />
          ) : (
            // ✅ CHANGED: Use dynamic colors instead of hardcoded green
            <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: colors.light }]}>
              <Text style={[styles.avatarText, { color: colors.dark }]}>
                {item.first_name.charAt(0).toUpperCase()}
                {item.last_name.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}

          <View style={styles.userDetails}>
            <Text style={styles.userName}>{fullName}</Text>
            {item.designation && (
              <Text style={styles.userDesignation}>{item.designation}</Text>
            )}
          </View>
        </View>

        <View
          style={[
            styles.checkbox,
            isSelected && styles.checkboxSelected,
          ]}
        >
          {isSelected && (
            <Ionicons name="checkmark" size={18} color="#ffffff" />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const filteredUsers = getFilteredUsers();

  return (
    <View style={styles.container}>
      {/* Header */}
      <StatusBar barStyle="light-content" backgroundColor="#008069" />
      <View style={styles.header}>
        <TouchableOpacity
          onPress={onBack}
          style={styles.backButton}
          disabled={adding}
        >
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Add Members</Text>
          <Text style={styles.headerSubtitle}>
            {selectedUsers.size} selected
          </Text>
        </View>

        <TouchableOpacity
          onPress={handleAddMembers}
          style={[
            styles.addButton,
            (selectedUsers.size === 0 || adding) && styles.addButtonDisabled,
          ]}
          disabled={selectedUsers.size === 0 || adding}
        >
          {adding ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Ionicons name="checkmark" size={24} color="#ffffff" />
          )}
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, email, or designation..."
          placeholderTextColor="#999999"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          editable={!adding}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={() => setSearchQuery('')}
            style={styles.clearButton}
          >
            <Ionicons name="close-circle" size={20} color="#999999" />
          </TouchableOpacity>
        )}
      </View>

      {/* Users List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00a884" />
          <Text style={styles.loadingText}>Loading users...</Text>
        </View>
      ) : filteredUsers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="people-outline" size={64} color="#cccccc" />
          <Text style={styles.emptyText}>
            {searchQuery ? 'No users found' : 'No users available to add'}
          </Text>
          {searchQuery && (
            <Text style={styles.emptySubtext}>
              Try searching with different keywords
            </Text>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredUsers}
          renderItem={renderUserItem}
          keyExtractor={(item) => (item.employee_id || item.id?.toString() || Math.random().toString())}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Selected Count Footer */}
      {selectedUsers.size > 0 && !loading && (
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {selectedUsers.size} member{selectedUsers.size !== 1 ? 's' : ''} selected
          </Text>
        </View>
      )}
    </View>
  );
};

// ✅ Styles remain the same
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00a884',
    paddingHorizontal: 16,
    paddingVertical: 12,
    // paddingTop: 20,
    marginTop: Platform.OS === 'ios' ? -80 : 0,
    paddingTop: Platform.OS === 'ios' ? 80 : 50,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  addButton: {
    padding: 8,
    marginLeft: 8,
  },
  addButtonDisabled: {
    opacity: 0.5,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    margin: 16,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#000000',
  },
  clearButton: {
    padding: 4,
    marginLeft: 8,
  },
  listContainer: {
    paddingBottom: 16,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  avatarPlaceholder: {
    // backgroundColor: '#00a884',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    // color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 2,
  },
  userDesignation: {
    fontSize: 14,
    color: '#666666',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#cccccc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#00a884',
    borderColor: '#00a884',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666666',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999999',
    marginTop: 8,
    textAlign: 'center',
  },
  footer: {
    backgroundColor: '#f5f5f5',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  footerText: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
  },
});