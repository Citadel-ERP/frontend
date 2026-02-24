// citadel_hub/MessageInfo.tsx
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  StatusBar,
  ImageBackground,
  Dimensions,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { getAvatarColor } from './avatarColors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Types (mirrored from your existing types, kept self-contained) ──────────

interface User {
  id?: number;
  employee_id?: string;
  first_name: string;
  last_name: string;
  profile_picture?: string;
  email?: string;
  designation?: string;
}

interface MessageReaction {
  id?: number;
  user: User;
  emoji: string;
}

interface Message {
  id: number | string;
  sender: User;
  content: string;
  message_type: 'text' | 'image' | 'file' | 'audio' | 'video' | 'system';
  created_at: string;
  is_edited: boolean;
  is_deleted?: boolean;
  is_forwarded?: boolean;
  reactions?: MessageReaction[];
  file_url?: string;
  file_name?: string;
  image_url?: string;
  video_url?: string;
  audio_url?: string;
  chat_room?: number | string;
  status?: string;
}

interface ChatRoom {
  id: number;
  name?: string;
  room_type: 'direct' | 'group';
  profile_picture?: string;
  members: any[];
}

interface ReadReceipt {
  user: User;
  read_at: string;
}

interface DeliveryInfo {
  user: User;
  delivered_at: string;
}

interface MessageInfoData {
  read_by: ReadReceipt[];
  delivered_to: DeliveryInfo[];
  sent_at: string;
  message_id: string | number;
}

interface MessageInfoProps {
  message: Message;
  chatRoom: ChatRoom;
  currentUser: User;
  onBack: () => void;
  apiCall: (endpoint: string, data: any) => Promise<any>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatTime = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

const formatDateTime = (dateString: string) => {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  let dayStr = '';
  if (date.toDateString() === today.toDateString()) {
    dayStr = 'Today';
  } else if (date.toDateString() === yesterday.toDateString()) {
    dayStr = 'Yesterday';
  } else {
    dayStr = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year:
        date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
    });
  }

  return `${dayStr}, ${formatTime(dateString)}`;
};

// ─── Avatar ───────────────────────────────────────────────────────────────────

const UserAvatar: React.FC<{ user: User; size?: number }> = ({
  user,
  size = 42,
}) => {
  const userId = user.employee_id || user.id?.toString() || '';
  const colors = getAvatarColor(userId);
  const initials = `${user.first_name?.[0] || '?'}${user.last_name?.[0] || ''}`;

  if (user.profile_picture) {
    return (
      <Image
        source={{ uri: user.profile_picture }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
      />
    );
  }

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.light,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Text
        style={{
          fontSize: size * 0.36,
          fontWeight: '600',
          color: colors.dark,
        }}
      >
        {initials}
      </Text>
    </View>
  );
};

// ─── Message Preview Bubble ───────────────────────────────────────────────────

const MessagePreviewBubble: React.FC<{ message: Message; currentUser: User }> = ({
  message,
  currentUser,
}) => {
  const renderContent = () => {
    if (message.is_deleted) {
      return (
        <View style={bubbleStyles.deletedRow}>
          <Ionicons name="ban-outline" size={14} color="#8696a0" />
          <Text style={bubbleStyles.deletedText}>This message was deleted</Text>
        </View>
      );
    }

    switch (message.message_type) {
      case 'image':
        return (
          <View>
            {message.image_url ? (
              <Image
                source={{ uri: message.image_url }}
                style={bubbleStyles.mediaThumb}
                resizeMode="cover"
              />
            ) : (
              <View style={[bubbleStyles.mediaThumb, bubbleStyles.mediaPlaceholder]}>
                <Ionicons name="image-outline" size={28} color="#8696a0" />
              </View>
            )}
            {message.content && message.content !== message.file_name && (
              <Text style={bubbleStyles.caption}>{message.content}</Text>
            )}
          </View>
        );

      case 'video':
        return (
          <View>
            <View style={[bubbleStyles.mediaThumb, bubbleStyles.mediaPlaceholder]}>
              <Ionicons name="videocam" size={28} color="#8696a0" />
              <Text style={bubbleStyles.mediaLabel}>Video</Text>
            </View>
          </View>
        );

      case 'audio':
        return (
          <View style={bubbleStyles.audioRow}>
            <Ionicons name="mic" size={18} color="#00a884" />
            <Text style={bubbleStyles.audioText}>Voice message</Text>
          </View>
        );

      case 'file':
        return (
          <View style={bubbleStyles.fileRow}>
            <Ionicons name="document-attach" size={22} color="#00a884" />
            <Text style={bubbleStyles.fileName} numberOfLines={1}>
              {message.file_name || message.content || 'File'}
            </Text>
          </View>
        );

      default:
        return (
          <Text style={bubbleStyles.messageText}>{message.content}</Text>
        );
    }
  };

  return (
    <View style={bubbleStyles.bubble}>
      {message.is_forwarded && !message.is_deleted && (
        <View style={bubbleStyles.forwardedRow}>
          <Ionicons name="arrow-forward" size={11} color="#8696a0" />
          <Text style={bubbleStyles.forwardedText}>Forwarded</Text>
        </View>
      )}
      {renderContent()}
      <View style={bubbleStyles.meta}>
        {message.is_edited && !message.is_deleted && (
          <Text style={bubbleStyles.editedLabel}>edited </Text>
        )}
        <Text style={bubbleStyles.time}>{formatTime(message.created_at)}</Text>
        {/* Blue double tick always since we're in info screen */}
        <Ionicons
          name="checkmark-done"
          size={14}
          color="#53bdeb"
          style={{ marginLeft: 3 }}
        />
      </View>
    </View>
  );
};

const bubbleStyles = StyleSheet.create({
  bubble: {
    backgroundColor: '#d9fdd3',
    borderRadius: 8,
    borderTopRightRadius: 0,
    padding: 8,
    maxWidth: SCREEN_WIDTH * 0.72,
    alignSelf: 'flex-end',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 1,
    elevation: 1,
  },
  messageText: {
    fontSize: 14.5,
    color: '#111b21',
    lineHeight: 20,
  },
  deletedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  deletedText: {
    fontSize: 14,
    color: '#8696a0',
    fontStyle: 'italic',
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
    gap: 1,
  },
  time: {
    fontSize: 11,
    color: '#8696a0',
  },
  editedLabel: {
    fontSize: 11,
    color: '#8696a0',
    fontStyle: 'italic',
  },
  mediaThumb: {
    width: 180,
    height: 150,
    borderRadius: 6,
    marginBottom: 4,
  },
  mediaPlaceholder: {
    backgroundColor: '#e9edef',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  mediaLabel: {
    fontSize: 12,
    color: '#667781',
  },
  caption: {
    fontSize: 14,
    color: '#111b21',
    marginTop: 2,
  },
  audioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
    minWidth: 140,
  },
  audioText: {
    fontSize: 14,
    color: '#111b21',
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(0,168,132,0.08)',
    borderRadius: 6,
    padding: 10,
    minWidth: 160,
  },
  fileName: {
    flex: 1,
    fontSize: 13.5,
    color: '#111b21',
    fontWeight: '500',
  },
  forwardedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
    paddingBottom: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  forwardedText: {
    fontSize: 11,
    color: '#8696a0',
    fontStyle: 'italic',
  },
});

// ─── Section Header ───────────────────────────────────────────────────────────

const SectionHeader: React.FC<{
  icon: string;
  iconColor: string;
  title: string;
  count?: number;
}> = ({ icon, iconColor, title, count }) => (
  <View style={sectionStyles.row}>
    <Ionicons name={icon as any} size={20} color={iconColor} />
    <Text style={sectionStyles.title}>{title}</Text>
    {count !== undefined && (
      <Text style={sectionStyles.count}>{count}</Text>
    )}
  </View>
);

const sectionStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 10,
    gap: 12,
  },
  title: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#00a884',
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  count: {
    fontSize: 13,
    color: '#8696a0',
    fontWeight: '500',
  },
});

// ─── Receipt Row ──────────────────────────────────────────────────────────────

const ReceiptRow: React.FC<{
  user: User;
  timestamp: string;
  isLast?: boolean;
}> = ({ user, timestamp, isLast }) => (
  <View style={[receiptStyles.row, !isLast && receiptStyles.rowBorder]}>
    <UserAvatar user={user} size={42} />
    <View style={receiptStyles.info}>
      <Text style={receiptStyles.name} numberOfLines={1}>
        {user.first_name} {user.last_name}
      </Text>
      {user.designation ? (
        <Text style={receiptStyles.designation} numberOfLines={1}>
          {user.designation}
        </Text>
      ) : null}
    </View>
    <Text style={receiptStyles.time}>{formatDateTime(timestamp)}</Text>
  </View>
);

const receiptStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 14,
    backgroundColor: '#ffffff',
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e9edef',
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: 15.5,
    fontWeight: '500',
    color: '#111b21',
  },
  designation: {
    fontSize: 12.5,
    color: '#8696a0',
    marginTop: 1,
  },
  time: {
    fontSize: 12,
    color: '#8696a0',
    flexShrink: 0,
    textAlign: 'right',
  },
});

// ─── Direct Chat Info (simple sent / delivered / read) ───────────────────────

const DirectChatInfo: React.FC<{
  sentAt: string;
  deliveredAt?: string;
  readAt?: string;
}> = ({ sentAt, deliveredAt, readAt }) => {
  const rows = [
    { icon: 'checkmark', color: '#8696a0', label: 'Sent', time: sentAt },
    {
      icon: 'checkmark-done',
      color: deliveredAt ? '#8696a0' : '#d1d5db',
      label: 'Delivered',
      time: deliveredAt,
    },
    {
      icon: 'checkmark-done',
      color: readAt ? '#53bdeb' : '#d1d5db',
      label: 'Read',
      time: readAt,
    },
  ];

  return (
    <View style={directStyles.card}>
      {rows.map(({ icon, color, label, time }, idx) => (
        <View
          key={label}
          style={[
            directStyles.row,
            idx < rows.length - 1 && directStyles.rowBorder,
          ]}
        >
          <Ionicons name={icon as any} size={20} color={color} />
          <Text style={directStyles.label}>{label}</Text>
          <Text style={directStyles.time}>
            {time ? formatDateTime(time) : '—'}
          </Text>
        </View>
      ))}
    </View>
  );
};

const directStyles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    marginHorizontal: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#e9edef',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 16,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e9edef',
  },
  label: {
    flex: 1,
    fontSize: 15.5,
    color: '#111b21',
    fontWeight: '400',
  },
  time: {
    fontSize: 13,
    color: '#8696a0',
  },
});

// ─── Empty State ──────────────────────────────────────────────────────────────

const EmptyReceiptState: React.FC<{ label: string }> = ({ label }) => (
  <View style={emptyStyles.container}>
    <Ionicons name="time-outline" size={28} color="#d1d5db" />
    <Text style={emptyStyles.text}>{label}</Text>
  </View>
);

const emptyStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
  },
  text: {
    fontSize: 14,
    color: '#8696a0',
    fontStyle: 'italic',
  },
});

// ─── Main Component ───────────────────────────────────────────────────────────

export const MessageInfo: React.FC<MessageInfoProps> = ({
  message,
  chatRoom,
  currentUser,
  onBack,
  apiCall,
}) => {
  const [infoData, setInfoData] = useState<MessageInfoData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isGroup = chatRoom.room_type === 'group';

  // ── Fetch message info from backend ────────────────────────────────────────
  const loadMessageInfo = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await apiCall('getMessageInfo', {
        message_id: message.id,
        chat_room_id: chatRoom.id,
      });

      if (result) {
        setInfoData({
          read_by: result.read_by || [],
          delivered_to: result.delivered_to || [],
          sent_at: message.created_at,
          message_id: message.id,
        });
      }
    } catch (err) {
      console.error('Error loading message info:', err);
      // Graceful fallback: construct from what we have locally
      setInfoData({
        read_by: [],
        delivered_to: [],
        sent_at: message.created_at,
        message_id: message.id,
      });
    } finally {
      setIsLoading(false);
    }
  }, [message.id, chatRoom.id]);

  useEffect(() => {
    loadMessageInfo();
  }, [loadMessageInfo]);

  // ── For direct chats, derive simple timestamps ──────────────────────────────
  const directReadAt =
    !isGroup && infoData?.read_by?.length
      ? infoData.read_by[0]?.read_at
      : undefined;

  const directDeliveredAt =
    !isGroup && infoData?.delivered_to?.length
      ? infoData.delivered_to[0]?.delivered_at
      : undefined;

  // ── Filter out current user from receipts ───────────────────────────────────
  const filterSelf = (users: { user: User }[]) =>
    users.filter(
      (r) =>
        (r.user.id || r.user.employee_id) !==
        (currentUser.id || currentUser.employee_id)
    );

  const readBy = infoData ? filterSelf(infoData.read_by as any) : [];
  const deliveredTo = infoData
    ? filterSelf(infoData.delivered_to as any)
    : [];

  // ── Members not in readBy or deliveredTo (still undelivered) ───────────────
  const readByIds = new Set(
    readBy.map(
      (r: any) => r.user.id?.toString() || r.user.employee_id
    )
  );

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={onBack}
          style={styles.backBtn}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={24} color="#111b21" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Message Info</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Message Preview on wallpaper background ── */}
        <ImageBackground
          source={require('../../assets/whatsappBackground.jpg')}
          style={styles.previewBackground}
          imageStyle={{ opacity: 0.35 }}
          resizeMode="cover"
        >
          <View style={styles.previewInner}>
            <MessagePreviewBubble message={message} currentUser={currentUser} />
          </View>
        </ImageBackground>

        {/* ── Divider ── */}
        <View style={styles.divider} />

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#00a884" />
            <Text style={styles.loadingText}>Loading info...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={36} color="#ea4335" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={loadMessageInfo}
              activeOpacity={0.8}
            >
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : isGroup ? (
          /* ── GROUP: Read by + Delivered to ── */
          <>
            {/* Read by section */}
            <SectionHeader
              icon="checkmark-done"
              iconColor="#53bdeb"
              title="Read by"
              count={readBy.length || undefined}
            />
            <View style={styles.sectionCard}>
              {readBy.length === 0 ? (
                <EmptyReceiptState label="No one has read this message yet" />
              ) : (
                (readBy as any[]).map((receipt: any, idx: number) => (
                  <ReceiptRow
                    key={
                      receipt.user.employee_id ||
                      receipt.user.id?.toString() ||
                      idx.toString()
                    }
                    user={receipt.user}
                    timestamp={receipt.read_at}
                    isLast={idx === readBy.length - 1}
                  />
                ))
              )}
            </View>

            {/* Delivered to section */}
            <SectionHeader
              icon="checkmark-done"
              iconColor="#8696a0"
              title="Delivered to"
              count={deliveredTo.length || undefined}
            />
            <View style={styles.sectionCard}>
              {deliveredTo.length === 0 ? (
                <EmptyReceiptState label="Not yet delivered to others" />
              ) : (
                (deliveredTo as any[]).map((delivery: any, idx: number) => (
                  <ReceiptRow
                    key={
                      delivery.user.employee_id ||
                      delivery.user.id?.toString() ||
                      idx.toString()
                    }
                    user={delivery.user}
                    timestamp={delivery.delivered_at}
                    isLast={idx === deliveredTo.length - 1}
                  />
                ))
              )}
            </View>

            {/* Sent timestamp */}
            <View style={styles.sentRow}>
              <Ionicons name="checkmark" size={16} color="#8696a0" />
              <Text style={styles.sentLabel}>Sent</Text>
              <Text style={styles.sentTime}>
                {formatDateTime(message.created_at)}
              </Text>
            </View>
          </>
        ) : (
          /* ── DIRECT CHAT: Simple timeline ── */
          <>
            <View style={styles.directLabel}>
              <Text style={styles.directLabelText}>Message details</Text>
            </View>
            <DirectChatInfo
              sentAt={message.created_at}
              deliveredAt={directDeliveredAt}
              readAt={directReadAt}
            />
          </>
        )}

        {/* Bottom padding */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

// ─── Main Styles ──────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f0f2f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingTop: Platform.OS === 'ios' ? 10 : 50,
    paddingBottom: 14,
    paddingHorizontal: 8,
    gap: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e9edef',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 2,
  },
  backBtn: {
    padding: 8,
    borderRadius: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111b21',
    letterSpacing: 0.1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  previewBackground: {
    width: '100%',
    minHeight: 120,
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  previewInner: {
    alignItems: 'flex-end',
  },
  divider: {
    height: 6,
    backgroundColor: '#f0f2f5',
  },
  sectionCard: {
    backgroundColor: '#ffffff',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#e9edef',
  },
  sentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#ffffff',
    marginTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#e9edef',
  },
  sentLabel: {
    flex: 1,
    fontSize: 15,
    color: '#111b21',
  },
  sentTime: {
    fontSize: 13,
    color: '#8696a0',
  },
  directLabel: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
  },
  directLabelText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8696a0',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 14,
  },
  loadingText: {
    fontSize: 14,
    color: '#8696a0',
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    paddingHorizontal: 40,
    gap: 12,
  },
  errorText: {
    fontSize: 14,
    color: '#667781',
    textAlign: 'center',
    lineHeight: 20,
  },
  retryBtn: {
    marginTop: 6,
    backgroundColor: '#00a884',
    paddingVertical: 10,
    paddingHorizontal: 28,
    borderRadius: 20,
  },
  retryText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default MessageInfo;