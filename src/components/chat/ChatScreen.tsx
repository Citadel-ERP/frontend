// screens/ChatScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  Alert,
  Modal,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BACKEND_URL } from '../../config/config';

const colors = {
  primary: '#2D3748',
  background: '#FFFFFF',
  backgroundSecondary: '#F7FAFC',
  text: '#2D3748',
  textSecondary: '#718096',
  textLight: '#A0AEC0',
  white: '#FFFFFF',
  border: '#E2E8F0',
  error: '#E53E3E',
};

const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
};

const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
};

const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
};

interface ChatRoom {
  id: string;
  name?: string;
  room_type: 'direct' | 'group';
  last_message?: string;
  last_message_at?: string;
  unread_count?: number;
  profile_picture?: string;
  members?: Array<{
    id: number;
    first_name: string;
    last_name: string;
    email: string;
  }>;
}

interface User {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  full_name: string;
}

interface ChatScreenProps {
  onBack: () => void;
  onOpenChatRoom: (chatRoom: ChatRoom) => void;
  currentUserId?: number;
}

const ChatScreen: React.FC<ChatScreenProps> = ({ onBack, onOpenChatRoom, currentUserId = 1 }) => {
  const [chats, setChats] = useState<ChatRoom[]>([]);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [isGroupChat, setIsGroupChat] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState<string>('');

  useEffect(() => {
    const getToken = async () => {
      const storedToken = await AsyncStorage.getItem('token_2');
      if (storedToken) {
        setToken(storedToken);
      }
    };
    getToken();
  }, []);

  useEffect(() => {
    if (token) {
      loadChatRooms();
    }
  }, [token]);

  const loadChatRooms = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${BACKEND_URL}/citadel_hub/getChatRooms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setChats(data.chat_rooms || []);
      } else {
        Alert.alert('Error', data.message || 'Failed to load chats');
      }
    } catch (error) {
      console.error('Error loading chats:', error);
      Alert.alert('Error', 'Failed to load chats');
    } finally {
      setLoading(false);
    }
  };

  const searchUsers = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await fetch(`${BACKEND_URL}/citadel_hub/searchUsers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          token,
          search: query 
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setSearchResults(data.users || []);
      }
    } catch (error) {
      console.error('Error searching users:', error);
    }
  };

  const createNewChat = async () => {
    if (selectedUsers.length === 0) return;

    try {
      setLoading(true);
      
      const endpoint = isGroupChat 
        ? `${BACKEND_URL}/citadel_hub/createGroupChat`
        : `${BACKEND_URL}/citadel_hub/createDirectChat`;
      
      const body = isGroupChat
        ? { 
            token,
            name: groupName, 
            member_ids: selectedUsers.map(user => user.id) 
          }
        : { 
            token,
            user_id: selectedUsers[0].id 
          };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setShowNewChatModal(false);
        resetNewChatModal();
        loadChatRooms(); // Reload chat list
        onOpenChatRoom(data.chat_room);
      } else {
        Alert.alert('Error', data.message || 'Failed to create chat');
      }
    } catch (error) {
      console.error('Error creating chat:', error);
      Alert.alert('Error', 'Failed to create chat');
    } finally {
      setLoading(false);
    }
  };

  const resetNewChatModal = () => {
    setSearchQuery('');
    setSearchResults([]);
    setSelectedUsers([]);
    setIsGroupChat(false);
    setGroupName('');
  };

  const getOtherUserName = (chatRoom: ChatRoom): string => {
    if (chatRoom.room_type === 'direct' && chatRoom.members) {
      const otherMember = chatRoom.members.find(member => member.id !== currentUserId);
      return otherMember ? `${otherMember.first_name} ${otherMember.last_name}` : 'Unknown User';
    }
    return chatRoom.name || 'Group Chat';
  };

  const formatTime = (timestamp?: string): string => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (hours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (hours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const getInitials = (name: string): string => {
    return name.split(' ').map(n => n.charAt(0).toUpperCase()).join('').substring(0, 2);
  };

  const renderChatItem = ({ item }: { item: ChatRoom }) => {
    const displayName = getOtherUserName(item);
    const initials = getInitials(displayName);

    return (
      <TouchableOpacity
        style={styles.chatItem}
        onPress={() => onOpenChatRoom(item)}
        activeOpacity={0.7}
      >
        <View style={styles.chatAvatar}>
          {item.profile_picture ? (
            <Image source={{ uri: item.profile_picture }} style={styles.chatAvatarImage} />
          ) : (
            <Text style={styles.chatAvatarText}>{initials}</Text>
          )}
        </View>
        
        <View style={styles.chatInfo}>
          <Text style={styles.chatName} numberOfLines={1}>
            {displayName}
          </Text>
          <Text style={styles.lastMessage} numberOfLines={1}>
            {item.last_message || 'No messages yet'}
          </Text>
        </View>
        
        <View style={styles.chatMeta}>
          <Text style={styles.chatTime}>
            {formatTime(item.last_message_at)}
          </Text>
          {item.unread_count && item.unread_count > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadCount}>
                {item.unread_count > 99 ? '99+' : item.unread_count}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderUserSearchItem = (user: User) => {
    const isSelected = selectedUsers.some(u => u.id === user.id);
    
    return (
      <TouchableOpacity
        key={user.id}
        style={[styles.userItem, isSelected && styles.userItemSelected]}
        onPress={() => {
          if (!isGroupChat) {
            setSelectedUsers([user]);
            setSearchQuery('');
            setSearchResults([]);
          } else {
            setSelectedUsers(prev => 
              prev.some(u => u.id === user.id) 
                ? prev.filter(u => u.id !== user.id)
                : [...prev, user]
            );
          }
        }}
      >
        <View style={styles.userItemContent}>
          <View style={styles.userAvatar}>
            <Text style={styles.userAvatarText}>
              {getInitials(user.full_name || `${user.first_name} ${user.last_name}`)}
            </Text>
          </View>
          <View style={styles.userDetails}>
            <Text style={styles.userName}>
              {user.full_name || `${user.first_name} ${user.last_name}`}
            </Text>
            <Text style={styles.userEmail}>{user.email}</Text>
          </View>
          {isSelected && (
            <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={onBack}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Messages</Text>
        
        <View style={styles.headerSpacer} />
      </View>

      {/* Chat List */}
      <View style={styles.chatListContainer}>
        {loading && chats.length === 0 ? (
          <View style={styles.emptyState}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading chats...</Text>
          </View>
        ) : chats.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="chatbubbles-outline" size={64} color={colors.textLight} />
            <Text style={styles.emptyStateText}>No chats yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Start a conversation by tapping the + button
            </Text>
          </View>
        ) : (
          <FlatList
            data={chats}
            renderItem={renderChatItem}
            keyExtractor={item => item.id.toString()}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.chatList}
          />
        )}
      </View>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowNewChatModal(true)}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color={colors.white} />
      </TouchableOpacity>

      {/* New Chat Modal */}
      <Modal
        visible={showNewChatModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowNewChatModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {isGroupChat ? 'Create Group Chat' : 'New Chat'}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowNewChatModal(false);
                  resetNewChatModal();
                }}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {isGroupChat && (
                <TextInput
                  style={styles.input}
                  placeholder="Group Name"
                  placeholderTextColor={colors.textLight}
                  value={groupName}
                  onChangeText={setGroupName}
                />
              )}

              <View style={styles.userSearchContainer}>
                <View style={styles.searchInputContainer}>
                  <Ionicons name="search" size={20} color={colors.textLight} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search users..."
                    placeholderTextColor={colors.textLight}
                    value={searchQuery}
                    onChangeText={(text) => {
                      setSearchQuery(text);
                      searchUsers(text);
                    }}
                  />
                </View>
                
                {searchResults.length > 0 && (
                  <View style={styles.searchResults}>
                    <ScrollView style={{ maxHeight: 300 }}>
                      {searchResults.map(user => renderUserSearchItem(user))}
                    </ScrollView>
                  </View>
                )}
              </View>

              {selectedUsers.length > 0 && (
                <View style={styles.selectedUsersContainer}>
                  <Text style={styles.selectedUsersLabel}>Selected:</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {selectedUsers.map(user => (
                      <View key={user.id} style={styles.selectedUserChip}>
                        <Text style={styles.selectedUserName}>
                          {user.full_name || `${user.first_name} ${user.last_name}`}
                        </Text>
                        <TouchableOpacity
                          onPress={() => setSelectedUsers(prev => prev.filter(u => u.id !== user.id))}
                        >
                          <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </ScrollView>
                </View>
              )}

              <TouchableOpacity
                style={[styles.button, styles.secondaryButton]}
                onPress={() => setIsGroupChat(!isGroupChat)}
                activeOpacity={0.7}
              >
                <Ionicons 
                  name={isGroupChat ? "person" : "people"} 
                  size={20} 
                  color={colors.text} 
                  style={{ marginRight: spacing.sm }}
                />
                <Text style={[styles.buttonText, styles.secondaryButtonText]}>
                  {isGroupChat ? 'Switch to Direct Chat' : 'Create Group Chat'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.button, 
                  (selectedUsers.length === 0 || loading || (isGroupChat && !groupName.trim())) && styles.buttonDisabled
                ]}
                onPress={createNewChat}
                disabled={selectedUsers.length === 0 || loading || (isGroupChat && !groupName.trim())}
                activeOpacity={0.7}
              >
                {loading ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <>
                    <Ionicons 
                      name="send" 
                      size={20} 
                      color={colors.white} 
                      style={{ marginRight: spacing.sm }}
                    />
                    <Text style={styles.buttonText}>
                      {isGroupChat ? 'Create Group' : 'Start Chat'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.secondaryButton]}
                onPress={() => {
                  setShowNewChatModal(false);
                  resetNewChatModal();
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.buttonText, styles.secondaryButtonText]}>Cancel</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: colors.background 
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.primary,
  },
  backButton: { 
    padding: spacing.sm, 
    borderRadius: borderRadius.sm 
  },
  headerTitle: {
    fontSize: fontSize.xl, 
    fontWeight: '600', 
    color: colors.white, 
    flex: 1, 
    textAlign: 'center',
  },
  headerSpacer: { 
    width: 40 
  },
  chatListContainer: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  chatList: {
    paddingBottom: spacing.lg,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  chatAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  chatAvatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  chatAvatarText: {
    color: colors.white,
    fontSize: fontSize.lg,
    fontWeight: 'bold',
  },
  chatInfo: {
    flex: 1,
  },
  chatName: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  lastMessage: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  chatMeta: {
    alignItems: 'flex-end',
  },
  chatTime: {
    fontSize: fontSize.xs,
    color: colors.textLight,
    marginBottom: spacing.xs,
  },
  unreadBadge: {
    backgroundColor: colors.primary,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  unreadCount: {
    color: colors.white,
    fontSize: fontSize.xs,
    fontWeight: 'bold',
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.lg,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
    backgroundColor: colors.white,
    marginBottom: spacing.md,
  },
  userSearchContainer: {
    marginBottom: spacing.md,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.white,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
    marginLeft: spacing.sm,
  },
  searchResults: {
    marginTop: spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    ...shadows.md,
  },
  userItem: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  userItemSelected: {
    backgroundColor: colors.backgroundSecondary,
  },
  userItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  userAvatarText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: 'bold',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  userEmail: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  selectedUsersContainer: {
    marginBottom: spacing.md,
  },
  selectedUsersLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  selectedUserChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
  },
  selectedUserName: {
    color: colors.white,
    fontSize: fontSize.sm,
    marginRight: spacing.sm,
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.sm,
    flexDirection: 'row',
    ...shadows.md,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryButtonText: {
    color: colors.text,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyStateText: {
    fontSize: fontSize.lg,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    fontWeight: '600',
  },
  emptyStateSubtext: {
    fontSize: fontSize.sm,
    color: colors.textLight,
    textAlign: 'center',
  },
  loadingText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
});

export default ChatScreen;