import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  RefreshControl,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getAvatarColor } from './avatarColors';

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
  members: (User | ChatRoomMember)[];
  last_message_at: string;
  created_at: string;
  is_muted?: boolean;
  muted_until?: string | null;  // ← NEW
  is_pinned?: boolean;
  unread_count?: number;
  last_message?: Message;
  block_status?: {             // ← NEW: backend already filters, but kept for safety
    is_blocked: boolean;
    blocked_by_me: boolean;
    blocked_by_other: boolean;
  };
}

interface ListProps {
  chatRooms: ChatRoom[];
  currentUser: User;
  onChatSelect: (room: ChatRoom) => void;
  onMute: (roomId: number, duration: string) => void;  // ← CHANGED: now takes duration
  onUnmute: (roomId: number) => void;
  onPin: (roomId: number) => void;
  onUnpin: (roomId: number) => void;
  onMarkAsUnread: (roomId: number) => void;
  onDeleteChat: (roomId: number) => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  onStartChat?: () => void;
  onScroll?: () => void;      // NEW
  onLoadMore?: () => void;    // NEW
  hasMore?: boolean;          // NEW
  isLoadingMore?: boolean;    // NEW
}

// ── Helper: is this chat actually muted right now (considering expiry) ─────
function isChatMuted(room: ChatRoom): boolean {
  if (!room.is_muted) return false;
  if (!room.muted_until) return true; // muted forever
  return new Date(room.muted_until) > new Date();
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
  onDeleteChat,
  onRefresh,
  onStartChat,
  isRefreshing = false,
  onScroll,      // NEW
  onLoadMore,    // NEW
  hasMore,       // NEW
  isLoadingMore, // NEW
}) => {
  const [contextMenuRoom, setContextMenuRoom] = useState<number | null>(null);
  // ── Mute duration sheet state ──────────────────────────────────────────────
  const [muteTargetRoomId, setMuteTargetRoomId] = useState<number | null>(null);
  const [showMuteSheet, setShowMuteSheet] = useState(false);

  const getUserFromMember = (member: User | ChatRoomMember): User | null => {
    if (!member) return null;
    if ('first_name' in member && 'last_name' in member) return member as User;
    if ('user' in member && member.user) return member.user;
    return null;
  };

  const getChatName = (room: ChatRoom) => {
    if (room.room_type === 'group') return room.name || 'Unnamed Group';
    const currentUserId = currentUser.id || currentUser.employee_id;
    const otherMember = room.members.find(m => {
      const user = getUserFromMember(m);
      return user && (user.id || user.employee_id) !== currentUserId;
    });
    const otherUser = getUserFromMember(otherMember!);
    return otherUser ? `${otherUser.first_name} ${otherUser.last_name}` : 'Unknown';
  };

  const getChatAvatar = (room: ChatRoom) => {
    if (room.room_type === 'group') {
      if (room.profile_picture) {
        return <Image source={{ uri: room.profile_picture }} style={styles.avatar} />;
      }
      const colors = getAvatarColor(room.id);
      return (
        <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: colors.light }]}>
          <Ionicons name="people" size={20} color={colors.dark} />
        </View>
      );
    }

    const currentUserId = currentUser.id || currentUser.employee_id;
    const otherMember = room.members.find(m => {
      const user = getUserFromMember(m);
      return user && (user.id || user.employee_id) !== currentUserId;
    });
    const otherUser = getUserFromMember(otherMember!);

    if (otherUser?.profile_picture) {
      return <Image source={{ uri: otherUser.profile_picture }} style={styles.avatar} />;
    }

    const initials = otherUser
      ? `${otherUser.first_name?.[0] || ''}${otherUser.last_name?.[0] || ''}`.toUpperCase()
      : '?';
    const userId = otherUser?.id || otherUser?.employee_id || room.id;
    const colors = getAvatarColor(userId);
    return (
      <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: colors.light }]}>
        <Text style={[styles.avatarText, { color: colors.dark }]}>{initials}</Text>
      </View>
    );
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    if (diffInHours < 24) return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    if (diffInHours < 48) return 'Yesterday';
    if (diffInHours < 168) return date.toLocaleDateString('en-US', { weekday: 'short' });
    return date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' });
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

  const handleDeleteChat = (roomId: number) => {
    setContextMenuRoom(null);
    Alert.alert(
      'Delete Chat',
      'Are you sure you want to delete this chat? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => onDeleteChat(roomId) },
      ]
    );
  };

  // ── Open mute duration sheet ───────────────────────────────────────────────
  const handleMutePress = (roomId: number) => {
    setContextMenuRoom(null);
    setMuteTargetRoomId(roomId);
    setShowMuteSheet(true);
  };

  const handleMuteOption = (duration: string) => {
    if (muteTargetRoomId != null) {
      onMute(muteTargetRoomId, duration);
    }
    setShowMuteSheet(false);
    setMuteTargetRoomId(null);
  };

  const pinnedCount = chatRooms.filter(r => r.is_pinned).length;

  const renderChatItem = ({ item: room, index }: { item: ChatRoom; index: number }) => {
    const isPinned = room.is_pinned;
    const muted = isChatMuted(room);            // ← uses expiry-aware helper
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
          <View style={styles.chatAvatar}>{getChatAvatar(room)}</View>

          <View style={styles.chatInfo}>
            <View style={styles.chatHeaderRow}>
              <Text style={styles.chatName} numberOfLines={1}>
                {getChatName(room)}
              </Text>
              {/* ── Time: grey when muted, normal otherwise ── */}
              <Text style={[styles.chatTime, muted && styles.chatTimeMuted]}>
                {formatTime(room.last_message_at)}
              </Text>
            </View>

            <View style={styles.chatPreviewRow}>
              <Text style={styles.chatPreview} numberOfLines={1}>
                {getLastMessagePreview(room)}
              </Text>

              <View style={styles.chatBadges}>
                {/* ── Mute bell — only shows when mute is actually active ── */}
                {muted && (
                  <Ionicons name="volume-mute" size={15} color="#8696a0" />
                )}
                {isPinned && (
                  <Ionicons name="pin" size={15} color="#8696a0" />
                )}
                {(room.unread_count || 0) > 0 && (
                  <View style={[
                    styles.unreadDot,
                    muted && styles.unreadDotMuted,  // grey dot when muted
                  ]} />
                )}
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconCircle}>
        <View style={styles.emptyIconInner}>
          <Ionicons name="chatbubbles-outline" size={52} color="#00a884" />
        </View>
      </View>
      <Text style={styles.emptyTitle}>No chats yet</Text>
      <Text style={styles.emptySubtitle}>Start a new conversation with your colleagues</Text>
      <TouchableOpacity style={styles.startChatButton} onPress={onStartChat} activeOpacity={0.8}>
        <Ionicons name="chatbubble-ellipses-outline" size={18} color="#ffffff" style={{ marginRight: 8 }} />
        <Text style={styles.startChatButtonText}>Start Chat</Text>
      </TouchableOpacity>
    </View>
  );

  const contextRoom = chatRooms.find(r => r.id === contextMenuRoom);
  const contextRoomMuted = contextRoom ? isChatMuted(contextRoom) : false;

  return (
    <View style={styles.container}>
      <FlatList
        data={chatRooms}
        renderItem={renderChatItem}
        keyExtractor={item => item.id.toString()}
        onScroll={onScroll}  // NEW: Forward scroll events
        scrollEventThrottle={400}  // NEW: Throttle to reduce events
        onEndReached={onLoadMore}  // NEW: Trigger load more at bottom
        onEndReachedThreshold={0.1}  // NEW: Trigger when 10% from bottom
        style={styles.list}
        contentContainerStyle={chatRooms.length === 0 ? styles.emptyListContent : undefined}
        ListEmptyComponent={renderEmptyState}
        // refreshControl={
        //   onRefresh ? (
        //     <RefreshControl
        //       refreshing={isRefreshing}
        //       onRefresh={onRefresh}
        //       colors={['#00a884']}
        //       tintColor="#00a884"
        //     />
        //   ) : undefined
        // }
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
        ListFooterComponent={
          hasMore && isLoadingMore ? (
            <View style={styles.loadingFooter}>
              <ActivityIndicator size="small" color="#00a884" />
            </View>
          ) : null
        }
      />

      {/* ── Long-press context menu ── */}
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
              onPress={() => { if (contextMenuRoom) { onMarkAsUnread(contextMenuRoom); setContextMenuRoom(null); } }}
              activeOpacity={0.7}
            >
              <Text style={styles.contextMenuText}>Mark as unread</Text>
            </TouchableOpacity>

            {/* {contextRoom?.is_pinned ? (
              <TouchableOpacity
                style={styles.contextMenuItem}
                onPress={() => { if (contextMenuRoom) { onUnpin(contextMenuRoom); setContextMenuRoom(null); } }}
                activeOpacity={0.7}
              >
                <Text style={styles.contextMenuText}>Unpin chat</Text>
              </TouchableOpacity>
            ) : pinnedCount < 5 ? (
              <TouchableOpacity
                style={styles.contextMenuItem}
                onPress={() => { if (contextMenuRoom) { onPin(contextMenuRoom); setContextMenuRoom(null); } }}
                activeOpacity={0.7}
              >
                <Text style={styles.contextMenuText}>Pin chat</Text>
              </TouchableOpacity>
            ) : null} */}

            {/* Mute / Unmute */}
            {contextRoomMuted ? (
              <TouchableOpacity
                style={styles.contextMenuItem}
                onPress={() => { if (contextMenuRoom) { onUnmute(contextMenuRoom); setContextMenuRoom(null); } }}
                activeOpacity={0.7}
              >
                <Text style={styles.contextMenuText}>Unmute notifications</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.contextMenuItem}
                onPress={() => contextMenuRoom && handleMutePress(contextMenuRoom)}
                activeOpacity={0.7}
              >
                <Text style={styles.contextMenuText}>Mute notifications</Text>
              </TouchableOpacity>
            )}

            {contextRoom?.room_type === 'direct' && (
              <TouchableOpacity
                style={styles.contextMenuItem}
                onPress={() => contextMenuRoom && handleDeleteChat(contextMenuRoom)}
                activeOpacity={0.7}
              >
                <Text style={[styles.contextMenuText, styles.deleteText]}>Delete chat</Text>
              </TouchableOpacity>
            )}
          </View>
        </Pressable>
      </Modal>

      {/* ── Mute duration bottom sheet ── */}
      <Modal
        visible={showMuteSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowMuteSheet(false)}
      >
        <Pressable style={styles.sheetOverlay} onPress={() => setShowMuteSheet(false)}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Mute notifications for…</Text>
            </View>
            <TouchableOpacity style={styles.sheetOption} onPress={() => handleMuteOption('8h')} activeOpacity={0.7}>
              <Text style={styles.sheetOptionText}>8 hours</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.sheetOption} onPress={() => handleMuteOption('24h')} activeOpacity={0.7}>
              <Text style={styles.sheetOptionText}>24 hours</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.sheetOption} onPress={() => handleMuteOption('always')} activeOpacity={0.7}>
              <Text style={styles.sheetOptionText}>Always</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.sheetOption, styles.sheetCancel]} onPress={() => setShowMuteSheet(false)} activeOpacity={0.7}>
              <Text style={styles.sheetCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { flex: 1 },
  emptyListContent: { flexGrow: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { alignItems: 'center', paddingHorizontal: 40, paddingBottom: 80 },
  emptyIconCircle: { width: 130, height: 130, borderRadius: 65, backgroundColor: 'rgba(0,168,132,0.08)', justifyContent: 'center', alignItems: 'center', marginBottom: 28 },
  emptyIconInner: { width: 96, height: 96, borderRadius: 48, backgroundColor: 'rgba(0,168,132,0.14)', justifyContent: 'center', alignItems: 'center' },
  emptyTitle: { fontSize: 22, fontWeight: '600', color: '#111b21', marginBottom: 10, textAlign: 'center' },
  emptySubtitle: { fontSize: 14, color: '#8696a0', textAlign: 'center', lineHeight: 21, marginBottom: 32 },
  startChatButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#00a884', paddingVertical: 13, paddingHorizontal: 32, borderRadius: 28, shadowColor: '#00a884', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  startChatButtonText: { color: '#ffffff', fontSize: 15, fontWeight: '600', letterSpacing: 0.3 },
  chatItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#e9edef' },
  chatItemPinned: { backgroundColor: '#f7f8fa' },
  chatAvatar: { marginRight: 12 },
  avatar: { width: 50, height: 50, borderRadius: 25 },
  avatarPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 18, fontWeight: '600' },
  chatInfo: { flex: 1, minWidth: 0 },
  chatHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 },
  chatName: { flex: 1, fontSize: 16, fontWeight: '500', color: '#111b21', marginRight: 8 },
  chatTime: { fontSize: 12, color: '#8696a0' },
  chatTimeMuted: { color: '#adb5bd' },
  chatPreviewRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chatPreview: { flex: 1, fontSize: 14, color: '#667781', marginRight: 8 },
  chatBadges: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  unreadDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#00a884' },
  unreadDotMuted: { backgroundColor: '#8696a0' },   // ← grey dot when muted
  pinnedDivider: { height: 8, backgroundColor: '#f0f2f5', justifyContent: 'center', paddingHorizontal: 16 },
  dividerLine: { height: 1, backgroundColor: '#e9edef' },
  modalBackdrop: { 
  flex: 1, 
  backgroundColor: 'rgba(0,0,0,0.4)', 
  justifyContent: 'center', 
  alignItems: 'center' 
},
contextMenu: { 
  backgroundColor: '#ffffff', 
  borderRadius: 16, 
  width: 300,
  paddingVertical: 4,
  shadowColor: '#000', 
  shadowOffset: { width: 0, height: 8 }, 
  shadowOpacity: 0.15, 
  shadowRadius: 24, 
  elevation: 10,
  overflow: 'hidden',
},
contextMenuItem: { 
  paddingVertical: 16, 
  paddingHorizontal: 24,
  borderBottomWidth: 1,
  borderBottomColor: '#f0f2f5',
},
contextMenuText: { 
  fontSize: 15, 
  color: '#111b21',
  fontWeight: '400',
  letterSpacing: 0.1,
},
deleteText: { 
  color: '#ef4444',
  fontWeight: '500',
},
  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#ffffff', borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingBottom: 28 },
  sheetHeader: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#e9edef' },
  sheetTitle: { fontSize: 16, fontWeight: '600', color: '#111b21', textAlign: 'center' },
  sheetOption: { paddingVertical: 16, paddingHorizontal: 20, borderBottomWidth: 0.5, borderBottomColor: '#e9edef' },
  sheetOptionText: { fontSize: 16, color: '#111b21' },
  sheetCancel: { borderBottomWidth: 0, marginTop: 8 },
  sheetCancelText: { fontSize: 16, color: '#00a884', fontWeight: '600', textAlign: 'center' },
  loadingFooter: {  // ← ADD THIS
    paddingVertical: 16,
    alignItems: 'center',
  },
});