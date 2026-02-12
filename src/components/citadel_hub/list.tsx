import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
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

interface ChatRoomMember {
  id?: number;
  user?: User;
  is_muted?: boolean;
  is_pinned?: boolean;
}

interface Message {
  id: number;
  sender: User;
  content: string;
  message_type: string;
  created_at: string;
}

interface ChatRoom {
  id: number;
  name?: string;
  description?: string;
  room_type: 'direct' | 'group';
  profile_picture?: string;
  admin?: User;
  members: (User | ChatRoomMember)[]; // ✅ Updated to handle both types
  last_message_at: string;
  created_at: string;
  is_muted?: boolean;
  is_pinned?: boolean;
  unread_count?: number;
  last_message?: Message;
}

interface ListProps {
  chatRooms: ChatRoom[];
  currentUser: User;
  onChatSelect: (room: ChatRoom) => void;
  onMute: (roomId: number) => void;
  onUnmute: (roomId: number) => void;
  onPin: (roomId: number) => void;
  onUnpin: (roomId: number) => void;
  onMarkAsUnread: (roomId: number) => void;
}

export const List: React.FC<ListProps> = ({
  chatRooms,
  currentUser,
  onChatSelect,
  onMute,
  onUnmute,
  onPin,
  onUnpin,
  onMarkAsUnread,
}) => {
  const [contextMenuRoom, setContextMenuRoom] = useState<number | null>(null);

  // ✅ Helper to extract User from ChatRoomMember or User
  const getUserFromMember = (member: User | ChatRoomMember): User | null => {
    if (!member) return null;
    if ('first_name' in member && 'last_name' in member) {
      return member as User;
    }
    if ('user' in member && member.user) {
      return member.user;
    }
    return null;
  };

  // ✅ FIXED: Properly filters out current user
  const getChatName = (room: ChatRoom) => {
    if (room.room_type === 'group') {
      return room.name || 'Unnamed Group';
    }
    
    // Find the OTHER user (not current user)
    const currentUserId = currentUser.id || currentUser.employee_id;
    
    const otherMember = room.members.find(m => {
      const user = getUserFromMember(m);
      const userId = user?.id || user?.employee_id;
      return user && userId !== currentUserId; // ✅ Exclude current user
    });
    
    const otherUser = getUserFromMember(otherMember!);
    return otherUser ? `${otherUser.first_name} ${otherUser.last_name}` : 'Unknown';
  };

  // ✅ FIXED: Properly filters out current user for avatar
  const getChatAvatar = (room: ChatRoom) => {
    if (room.room_type === 'group') {
      console.log('Getting avatar for group chat:', room.profile_picture);
      if (room.profile_picture) {
        return (
          <Image
            source={{ uri: room.profile_picture }}
            style={styles.avatar}
          />
        );
      }
      return (
        <View style={[styles.avatar, styles.avatarPlaceholder]}>
          <Ionicons name="people" size={20} color="#8696a0" />
        </View>
      );
    }
    
    // Find the OTHER user (not current user)
    const currentUserId = currentUser.id || currentUser.employee_id;
    
    const otherMember = room.members.find(m => {
      const user = getUserFromMember(m);
      const userId = user?.id || user?.employee_id;
      return user && userId !== currentUserId; // ✅ Exclude current user
    });
    
    const otherUser = getUserFromMember(otherMember!);
    
    if (otherUser?.profile_picture) {
      return (
        <Image
          source={{ uri: otherUser.profile_picture }}
          style={styles.avatar}
        />
      );
    }
    
    return (
      <View style={[styles.avatar, styles.avatarPlaceholder]}>
        <Text style={styles.avatarText}>
          {otherUser ? `${otherUser.first_name?.[0] || ''}${otherUser.last_name?.[0] || ''}` : '?'}
        </Text>
      </View>
    );
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else if (diffInHours < 168) {
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' });
    }
  };

  const getLastMessagePreview = (room: ChatRoom) => {
    if (!room.last_message) return 'No messages yet';
    
    const { sender, content, message_type } = room.last_message;
    const senderName = sender.id === currentUser.id ? 'You' : sender.first_name;
    
    if (message_type === 'image') return `${senderName}: 📷 Photo`;
    if (message_type === 'file') return `${senderName}: 📄 File`;
    if (message_type === 'audio') return `${senderName}: 🎤 Audio`;
    if (message_type === 'video') return `${senderName}: 🎥 Video`;
    
    return `${senderName}: ${content}`;
  };

  const pinnedCount = chatRooms.filter(r => r.is_pinned).length;

  const renderChatItem = ({ item: room, index }: { item: ChatRoom; index: number }) => {
    const isPinned = room.is_pinned;
    const showPinnedDivider = index > 0 && chatRooms[index - 1].is_pinned && !isPinned;

    return (
      <View>
        {showPinnedDivider && (
          <View style={styles.pinnedDivider}>
            <View style={styles.dividerLine} />
          </View>
        )}
        
        <TouchableOpacity
          style={[styles.chatItem, isPinned && styles.chatItemPinned]}
          onPress={() => onChatSelect(room)}
          onLongPress={() => setContextMenuRoom(room.id)}
          activeOpacity={0.7}
        >
          <View style={styles.chatAvatar}>
            {getChatAvatar(room)}
          </View>

          <View style={styles.chatInfo}>
            <View style={styles.chatHeaderRow}>
              <Text style={styles.chatName} numberOfLines={1}>
                {getChatName(room)}
              </Text>
              <Text style={styles.chatTime}>
                {formatTime(room.last_message_at)}
              </Text>
            </View>

            <View style={styles.chatPreviewRow}>
              <Text style={styles.chatPreview} numberOfLines={1}>
                {getLastMessagePreview(room)}
              </Text>
              <View style={styles.chatBadges}>
                {room.is_muted && (
                  <Ionicons name="volume-mute" size={16} color="#8696a0" />
                )}
                {isPinned && (
                  <Ionicons name="pin" size={16} color="#8696a0" />
                )}
                {(room.unread_count || 0) > 0 && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadBadgeText}>
                      {room.unread_count}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={chatRooms}
        renderItem={renderChatItem}
        keyExtractor={(item) => item.id.toString()}
        style={styles.list}
      />

      {/* Context Menu Modal */}
      <Modal
        visible={contextMenuRoom !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setContextMenuRoom(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setContextMenuRoom(null)}>
          <View style={styles.contextMenu}>
            <TouchableOpacity
              style={styles.contextMenuItem}
              onPress={() => {
                if (contextMenuRoom) {
                  onMarkAsUnread(contextMenuRoom);
                  setContextMenuRoom(null);
                }
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.contextMenuText}>Mark as unread</Text>
            </TouchableOpacity>

            {contextMenuRoom && chatRooms.find(r => r.id === contextMenuRoom)?.is_pinned ? (
              <TouchableOpacity
                style={styles.contextMenuItem}
                onPress={() => {
                  if (contextMenuRoom) {
                    onUnpin(contextMenuRoom);
                    setContextMenuRoom(null);
                  }
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.contextMenuText}>Unpin chat</Text>
              </TouchableOpacity>
            ) : pinnedCount < 5 && (
              <TouchableOpacity
                style={styles.contextMenuItem}
                onPress={() => {
                  if (contextMenuRoom) {
                    onPin(contextMenuRoom);
                    setContextMenuRoom(null);
                  }
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.contextMenuText}>Pin chat</Text>
              </TouchableOpacity>
            )}

            {contextMenuRoom && chatRooms.find(r => r.id === contextMenuRoom)?.is_muted ? (
              <TouchableOpacity
                style={styles.contextMenuItem}
                onPress={() => {
                  if (contextMenuRoom) {
                    onUnmute(contextMenuRoom);
                    setContextMenuRoom(null);
                  }
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.contextMenuText}>Unmute notifications</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.contextMenuItem}
                onPress={() => {
                  if (contextMenuRoom) {
                    onMute(contextMenuRoom);
                    setContextMenuRoom(null);
                  }
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.contextMenuText}>Mute notifications</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.contextMenuItem}
              onPress={() => setContextMenuRoom(null)}
              activeOpacity={0.7}
            >
              <Text style={styles.contextMenuText}>Delete chat</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    flex: 1,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9edef',
  },
  chatItemPinned: {
    backgroundColor: '#f7f8fa',
  },
  chatAvatar: {
    marginRight: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarPlaceholder: {
    backgroundColor: '#e9edef',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#8696a0',
  },
  chatInfo: {
    flex: 1,
    minWidth: 0,
  },
  chatHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  chatName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#111b21',
    marginRight: 8,
  },
  chatTime: {
    fontSize: 12,
    color: '#8696a0',
  },
  chatPreviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chatPreview: {
    flex: 1,
    fontSize: 14,
    color: '#667781',
    marginRight: 8,
  },
  chatBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  unreadBadge: {
    backgroundColor: '#00a884',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  unreadBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  pinnedDivider: {
    height: 8,
    backgroundColor: '#f0f2f5',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  dividerLine: {
    height: 1,
    backgroundColor: '#e9edef',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contextMenu: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    minWidth: 200,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  contextMenuItem: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  contextMenuText: {
    fontSize: 14,
    color: '#111b21',
  },
});