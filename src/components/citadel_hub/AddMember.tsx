import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { User } from './CitadelHub';

interface AddMemberProps {
  currentMembers: User[];
  currentUser: User;
  groupId: number;
  onBack: () => void;
  onAddMembers: (memberIds: string[]) => Promise<void>;
  apiCall: (endpoint: string, data: any) => Promise<any>;
}

export const AddMember: React.FC<AddMemberProps> = ({
  currentMembers,
  currentUser,
  groupId,
  onBack,
  onAddMembers,
  apiCall,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const result = await apiCall('getEmployees', {});
      
      if (result.employees) {
        // Filter out current members and current user
        const currentMemberIds = new Set(
          currentMembers.map(m => m.employee_id || m.id?.toString())
        );
        const currentUserId = currentUser.employee_id || currentUser.id?.toString();
        
        const availableUsers = result.employees.filter((user: User) => {
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

  const handleAddMembers = async () => {
    if (selectedUsers.size === 0) {
      Alert.alert('No Selection', 'Please select at least one member to add.');
      return;
    }

    try {
      setAdding(true);
      await onAddMembers(Array.from(selectedUsers));
    } catch (error) {
      console.error('Error in handleAddMembers:', error);
    } finally {
      setAdding(false);
    }
  };

  const renderUserItem = ({ item }: { item: User }) => {
    const userId = item.employee_id || item.id?.toString() || '';
    const isSelected = selectedUsers.has(userId);
    const fullName = `${item.first_name} ${item.last_name}`;

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
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarText}>
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
    paddingTop: 16,
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
    backgroundColor: '#00a884',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#ffffff',
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