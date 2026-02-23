//citadel_hub/Chat.tsx
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
  Keyboard,
  Animated,
  PanResponder,
  Dimensions,
  Linking,
  Clipboard,
  ImageBackground,
  StatusBar,
  Pressable

} from 'react-native';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { EmojiPicker } from './emojiPicker';
import { AttachmentMenu } from './attachmentMenu';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { ImagePreview } from './imagePreview';
import { VideoPlayer } from './videoPlayer';
import { CameraRecorder } from './cameraRecorder';
import { Video, ResizeMode } from 'expo-av';
import { AudioRecorder } from './audioRecorder';
import { AudioPlayer } from './audioPlayer';
import { getAvatarColor } from './avatarColors';
import { ContactMessage } from './contactMessage';
import { ContactDetail } from './contactDetail';
import { ContactData } from './contactPicker';



const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const EMOJI_PICKER_HEIGHT = SCREEN_HEIGHT * 0.4;
const INPUT_CONTAINER_HEIGHT = 60;

// Swipe threshold to trigger reply
const SWIPE_THRESHOLD = 60;
const SWIPE_MAX = 80;

// Message cache for instant loading
const messageCache = new Map();
const CACHE_SIZE = 20;

interface User {
  id?: number;
  employee_id?: string;
  first_name: string;
  last_name: string;
  profile_picture?: string;
  email?: string;
}

interface ChatRoomMember {
  id?: number;
  user?: User;
  is_muted?: boolean;
  is_pinned?: boolean;
}

interface MessageReaction {
  id?: number;
  user: User;
  emoji: string;
}

interface MessageReadReceipt {
  user: User;
  read_at: string;
}

// ============= MESSAGE STATUS TYPE =============
type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

interface Message {
  id: number | string;
  sender: User;
  content: string;
  message_type: 'text' | 'image' | 'file' | 'audio' | 'video' | "system";
  created_at: string;
  is_edited: boolean;
  parent_message?: Message;
  reactions?: MessageReaction[];
  file_url?: string;
  file_name?: string;
  chat_room?: number | string;
  is_deleted?: boolean;
  is_forwarded?: boolean;
  image_url?: string;
  video_url?: string;
  audio_url?: string;
  // ============= STATUS FIELDS =============
  status?: MessageStatus;
  tempId?: string;
  isUploading?: boolean;
  read_receipts?: MessageReadReceipt[];
  // ========================================
}

interface ChatRoom {
  id: number;
  name?: string;
  room_type: 'direct' | 'group';
  profile_picture?: string;
  members: (User | ChatRoomMember)[];
  is_muted?: boolean;
  blocked_by?: User;
  blocked_at?: string;
  block_status?: {
    is_blocked: boolean;
    blocked_by_me: boolean;
    blocked_by_other: boolean;
    blocker_name?: string;
  };
}

interface ChatProps {
  chatRoom: ChatRoom;
  messages: Message[];
  currentUser: User;
  typingUsers: User[];
  userStatuses?: { [userId: string]: 'online' | 'offline' | 'away' | 'busy' };
  onBack: () => void;
  onHeaderClick: () => void;
  onSendMessage: (content: string, type?: string, file?: any, parentId?: number) => void;
  onTyping: () => void;
  onStopTyping: () => void;
  onReact: (messageId: number, emoji: string) => void;
  onLoadMore: () => void;
  hasMore: boolean;
  isLoading: boolean;
  onSearch: (query: string, offset: number, callback?: (results: Message[], hasMore: boolean) => void) => void;
  onClearChat: () => void;
  onDeleteForMe: (messageId: number) => void;
  onDeleteForEveryone: (messageId: number) => void;
  onShare?: (messageIds: number[], messages: Message[], chatRoomId?: number) => void;
  onRetry?: (tempId: string) => void;
  ws?: React.MutableRefObject<WebSocket | null>;
  onMessageInfo?: (message: Message) => void;
  onMute?: (duration: string) => void;
  onUnmute?: () => void;
  onContactPress?: () => void;
  onScroll?: (event: any) => void;
}

const QUICK_REACTIONS = ['😂', '👍', '😢', '❤️', '😮', '🙏', '👏'];

const getEffectiveStatus = (
  message: Message,
  currentUser: User,
  chatRoom: ChatRoom
): MessageStatus | undefined => {
  // Always trust explicit frontend status for in-progress states
  if (message.status === 'sending' || message.status === 'failed') {
    return message.status;
  }
  // Status ticks only apply to own messages
  const currentUserId = currentUser.id || currentUser.employee_id;
  const senderId = message.sender.id || message.sender.employee_id;
  if (senderId !== currentUserId) {
    return message.status;
  }
  // If backend sent read_receipts, derive 'read' from them
  const receipts = message.read_receipts;
  if (receipts && receipts.length > 0) {
    const readByOther = receipts.some(r => {
      const rUserId = r.user?.id || r.user?.employee_id;
      return rUserId !== currentUserId;
    });
    if (readByOther) return 'read';
  }
  // Fall back to explicit status if set
  if (message.status) return message.status;
  // Real DB messages (non-temp IDs) default to 'delivered'
  if (!String(message.id).startsWith('temp_')) return 'delivered';
  return undefined;
};

const MessageStatusTick: React.FC<{ status?: MessageStatus }> = ({ status }) => {
  if (status === 'sending') {
    // Single grey clock / pending tick
    return (
      <Ionicons
        name="time-outline"
        size={14}
        color="#8696a0"
        style={styles.messageStatus}
      />
    );
  }
  if (status === 'failed') {
    // Handled separately with retry button
    return null;
  }
  if (status === 'sent') {
    // Single grey tick
    return (
      <Ionicons
        name="checkmark"
        size={14}
        color="#8696a0"
        style={styles.messageStatus}
      />
    );
  }
  if (status === 'delivered' || !status) {
    return (
      <Ionicons
        name="checkmark-done"
        size={14}
        color="#8696a0"
        style={styles.messageStatus}
      />
    );
  }
  if (status === 'read') {
    return (
      <Ionicons
        name="checkmark-done"
        size={14}
        color="#53bdeb"
        style={styles.messageStatus}
      />
    );
  }
  return null;
};



interface SwipeableMessageProps {
  children: React.ReactNode;
  isOwnMessage: boolean;
  onSwipeReply: () => void;
  disabled?: boolean;
}

const SwipeableMessage: React.FC<SwipeableMessageProps> = ({
  children,
  isOwnMessage,
  onSwipeReply,
  disabled = false,
}) => {
  const translateX = useRef(new Animated.Value(0)).current;
  const swipeTriggered = useRef(false);
  const replyIconOpacity = useRef(new Animated.Value(0)).current;
  const replyIconScale = useRef(new Animated.Value(0.5)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        if (disabled) return false;
        const { dx, dy } = gestureState;
        // Only capture mostly-horizontal swipes
        return Math.abs(dx) > Math.abs(dy) * 1.5 && Math.abs(dx) > 8;
      },
      onPanResponderGrant: () => {
        swipeTriggered.current = false;
      },
      onPanResponderMove: (_, gestureState) => {
        const { dx } = gestureState;

        // Own messages: swipe left (negative dx)
        // Other messages: swipe right (positive dx)
        if (isOwnMessage) {
          if (dx < 0) {
            const clamped = Math.max(dx, -SWIPE_MAX);
            translateX.setValue(clamped);
            const progress = Math.min(Math.abs(clamped) / SWIPE_THRESHOLD, 1);
            replyIconOpacity.setValue(progress);
            replyIconScale.setValue(0.5 + progress * 0.5);

            if (Math.abs(clamped) >= SWIPE_THRESHOLD && !swipeTriggered.current) {
              swipeTriggered.current = true;
            }
          }
        } else {
          if (dx > 0) {
            const clamped = Math.min(dx, SWIPE_MAX);
            translateX.setValue(clamped);
            const progress = Math.min(clamped / SWIPE_THRESHOLD, 1);
            replyIconOpacity.setValue(progress);
            replyIconScale.setValue(0.5 + progress * 0.5);

            if (clamped >= SWIPE_THRESHOLD && !swipeTriggered.current) {
              swipeTriggered.current = true;
            }
          }
        }
      },
      onPanResponderRelease: () => {
        const wasTriggered = swipeTriggered.current;

        // Spring back to original position
        Animated.parallel([
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            tension: 200,
            friction: 20,
          }),
          Animated.timing(replyIconOpacity, {
            toValue: 0,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(replyIconScale, {
            toValue: 0.5,
            duration: 150,
            useNativeDriver: true,
          }),
        ]).start();

        if (wasTriggered) {
          onSwipeReply();
        }

        swipeTriggered.current = false;
      },
      onPanResponderTerminate: () => {
        Animated.parallel([
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            tension: 200,
            friction: 20,
          }),
          Animated.timing(replyIconOpacity, {
            toValue: 0,
            duration: 150,
            useNativeDriver: true,
          }),
        ]).start();
        swipeTriggered.current = false;
      },
    })
  ).current;

  // Reply icon positioned based on message direction
  const replyIconStyle = isOwnMessage
    ? { right: -36, left: undefined }
    : { left: -36, right: undefined };

  return (
    <View style={{ position: 'relative', overflow: 'visible' }}>
      {/* Reply hint icon */}
      <Animated.View
        style={[
          swipeStyles.replyIcon,
          replyIconStyle,
          {
            opacity: replyIconOpacity,
            transform: [{ scale: replyIconScale }],
          },
        ]}
        pointerEvents="none"
      >
        <Ionicons name="return-up-back" size={20} color="#00a884" />
      </Animated.View>

      <Animated.View
        style={{ transform: [{ translateX }] }}
        {...panResponder.panHandlers}
      >
        {children}
      </Animated.View>
    </View>
  );
};

const swipeStyles = StyleSheet.create({
  replyIcon: {
    position: 'absolute',
    top: '50%',
    marginTop: -16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 168, 132, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
});

// ============================================================
// Main Chat Component
// ============================================================

export const Chat: React.FC<ChatProps> = ({
  chatRoom,
  messages,
  currentUser,
  typingUsers,
  userStatuses,
  onBack,
  onHeaderClick,
  onSendMessage,
  onTyping,
  onStopTyping,
  onReact,
  onLoadMore,
  hasMore,
  isLoading,
  onSearch,
  onClearChat,
  onDeleteForMe,
  onDeleteForEveryone,
  onShare,
  onRetry,
  ws,
  onMessageInfo,
  onMute,
  onUnmute,
  onContactPress,
  onScroll,
}) => {
  const [inputText, setInputText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [selectedMessages, setSelectedMessages] = useState<number[]>([]);
  const [longPressedMessage, setLongPressedMessage] = useState<Message | null>(null);
  const [showQuickReactions, setShowQuickReactions] = useState(false);
  const [reactionPosition, setReactionPosition] = useState({ x: 0, y: 0 });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [isPickingMedia, setIsPickingMedia] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [searchResults, setSearchResults] = useState<Message[]>([]);
  const [searchOffset, setSearchOffset] = useState(0);
  const [hasMoreSearchResults, setHasMoreSearchResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [showClearChatConfirm, setShowClearChatConfirm] = useState(false);
  const [showMessageOptionsModal, setShowMessageOptionsModal] = useState(false);
  const [isEmojiMode, setIsEmojiMode] = useState(false);
  const [messageOptionsPosition, setMessageOptionsPosition] = useState({ x: 0, y: 0 });
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [previewImageUri, setPreviewImageUri] = useState<string>('');
  const [selectedVideoUrl, setSelectedVideoUrl] = useState<string | null>(null);
  const [showCameraRecorder, setShowCameraRecorder] = useState(false);
  const [cameraMode, setCameraMode] = useState<'picture' | 'video'>('picture');
  const [showAudioRecorder, setShowAudioRecorder] = useState(false);
  const [showMuteSheet, setShowMuteSheet] = useState(false);
  const [contactDetailVisible, setContactDetailVisible] = useState(false);
  const [detailContact, setDetailContact] = useState<ContactData | null>(null);

  // ── Highlight state for scroll-to-parent ──
  const [highlightedMessageId, setHighlightedMessageId] = useState<number | string | null>(null);
  const highlightAnim = useRef(new Animated.Value(0)).current;

  const isBlocked = chatRoom.block_status?.is_blocked;
  const isBlockedByMe = chatRoom.block_status?.blocked_by_me;
  const isBlockedByOther = chatRoom.block_status?.blocked_by_other;

  const inputRef = useRef<TextInput>(null);
  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messageRefs = useRef<{ [key: string]: View | null }>({});
  // Map from message id → index in the displayMessages array (inverted list)
  const messageIndexMap = useRef<{ [key: string]: number }>({});
  const previousRoomId = useRef<number | null>(null);

  const reactionBarScale = useRef(new Animated.Value(0)).current;
  const reactionBarOpacity = useRef(new Animated.Value(0)).current;
  const deleteModalSlide = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const messageOptionsScale = useRef(new Animated.Value(0)).current;
  const messageOptionsOpacity = useRef(new Animated.Value(0)).current;

  // Cache messages when room changes
  useEffect(() => {
    if (chatRoom) {
      const cacheKey = `room_${chatRoom.id}`;
      messageCache.set(cacheKey, messages.slice(-CACHE_SIZE));
      if (messageCache.size > 10) {
        const firstKey = messageCache.keys().next().value;
        messageCache.delete(firstKey);
      }
    }
  }, [chatRoom?.id, messages]);

  const clearMessageCacheForRoom = (roomId: number) => {
    const cacheKey = `room_${roomId}`;
    messageCache.delete(cacheKey);
  };

  const [displayMessages, setDisplayMessages] = useState<Message[]>([]);

  const handleCameraCapture = (uri: string, type: 'photo' | 'video') => {
    if (type === 'picture') {
      setPreviewImageUri(uri);
      setShowImagePreview(true);
    } else if (type === 'video') {
      const videoFile = {
        uri: uri,
        type: 'video/mp4',
        name: `video_${Date.now()}.mp4`,
      };
      onSendMessage(videoFile.name, 'video', videoFile, replyingTo?.id);
      setReplyingTo(null);
    }
    setShowCameraRecorder(false);
  };

  // Keyboard listeners
  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(Platform.OS === 'ios' ? e.endCoordinates.height - 35 : e.endCoordinates.height);
        if (isEmojiMode) {
          setIsEmojiMode(false);
          setShowEmojiPicker(false);
        }
      }
    );

    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, [isEmojiMode]);

  const getOtherUserStatus = useCallback(() => {
    if (chatRoom.room_type === 'group') {
      return null;
    }

    const currentUserId = currentUser.id || currentUser.employee_id;
    const otherMember = chatRoom.members.find(m => {
      const user = getUserFromMember(m);
      return user && (user.id || user.employee_id) !== currentUserId;
    });

    if (!otherMember) return 'offline';

    const otherUser = getUserFromMember(otherMember);
    if (!otherUser) return 'offline';

    const userId = String(otherUser.id || otherUser.employee_id);
    return userStatuses?.[userId] || 'offline';
  }, [chatRoom, currentUser, userStatuses]);

  // Room change handling - clear state
  useEffect(() => {
    if (previousRoomId.current !== chatRoom?.id) {
      setDisplayMessages([]);
      setSelectedMessages([]);
      setShowQuickReactions(false);
      setLongPressedMessage(null);
      setReplyingTo(null);
      setIsSearchMode(false);
      setSearchText('');
      setSearchResults([]);
      setShowMessageOptionsModal(false);

      if (previousRoomId.current !== null) {
        clearMessageCacheForRoom(previousRoomId.current);
      }

      const cacheKey = `room_${chatRoom?.id}`;
      const cached = messageCache.get(cacheKey);
      if (cached && cached.length > 0) {
        setDisplayMessages([...cached].reverse());
      }

      previousRoomId.current = chatRoom?.id || null;
    } else {
      setDisplayMessages([...messages].reverse());
    }
  }, [chatRoom?.id, messages]);

  // Active room tracking via WebSocket
  useEffect(() => {
  if (!chatRoom?.id) return;
  const isWsReady = ws?.current?.readyState === WebSocket.OPEN;
  if (!isWsReady) return;

  try {
    ws.current.send(JSON.stringify({
      action: 'set_active_room',
      room_id: chatRoom.id
    }));
    // ✅ ADD THIS — tell server you've read messages when you open the chat
    ws.current.send(JSON.stringify({
      action: 'read_messages',
      room_id: chatRoom.id
    }));
  } catch (error) {
    console.error('❌ Failed to set active room:', error);
  }

  return () => {
    if (ws?.current?.readyState === WebSocket.OPEN) {
      try {
        ws.current.send(JSON.stringify({ action: 'clear_active_room' }));
      } catch (error) {}
    }
  };
}, [chatRoom?.id]);

  // Animate reaction bar
  useEffect(() => {
    if (showQuickReactions && selectedMessages.length === 1) {
      Animated.parallel([
        Animated.spring(reactionBarScale, {
          toValue: 1,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }),
        Animated.timing(reactionBarOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(reactionBarScale, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(reactionBarOpacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [showQuickReactions, selectedMessages.length]);

  // Animate message options modal
  useEffect(() => {
    if (showMessageOptionsModal) {
      Animated.parallel([
        Animated.spring(messageOptionsScale, {
          toValue: 1,
          useNativeDriver: true,
          tension: 150,
          friction: 10,
        }),
        Animated.timing(messageOptionsOpacity, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(messageOptionsScale, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(messageOptionsOpacity, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [showMessageOptionsModal]);

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

  const getChatName = useCallback(() => {
    if (chatRoom.room_type === 'group') {
      return chatRoom.name || 'Unnamed Group';
    }
    const currentUserId = currentUser.id || currentUser.employee_id;
    const otherMember = chatRoom.members.find(m => {
      const user = getUserFromMember(m);
      return user && (user.id || user.employee_id) !== currentUserId;
    });
    if (otherMember) {
      const user = getUserFromMember(otherMember);
      return user ? `${user.first_name || 'Unknown'} ${user.last_name || ''}` : 'Unknown';
    }
    return 'Unknown';
  }, [chatRoom, currentUser]);

  const handleAudioCapture = (uri: string) => {
    const audioFile = {
      uri: uri,
      type: 'audio/m4a',
      name: `audio_${Date.now()}.m4a`,
    };
    onSendMessage(audioFile.name, 'audio', audioFile, replyingTo?.id);
    setReplyingTo(null);
    setShowAudioRecorder(false);
  };

  const handleViewContact = useCallback((contactData: ContactData) => {
    setDetailContact(contactData);
    setContactDetailVisible(true);
  }, []);

  const getChatAvatar = useCallback(() => {
    if (chatRoom.room_type === 'group') {
      if (chatRoom.profile_picture) {
        return (
          <Image source={{ uri: chatRoom.profile_picture }} style={styles.avatar} />
        );
      }
      const colors = getAvatarColor(chatRoom.id);
      return (
        <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: colors.light }]}>
          <Ionicons name="people" size={20} color={colors.dark} />
        </View>
      );
    }

    const currentUserId = currentUser.id || currentUser.employee_id;
    const otherMember = chatRoom.members.find(m => {
      const user = getUserFromMember(m);
      return user && (user.id || user.employee_id) !== currentUserId;
    });
    const otherUser = otherMember ? getUserFromMember(otherMember) : null;

    if (otherUser?.profile_picture) {
      return (
        <Image source={{ uri: otherUser.profile_picture }} style={styles.avatar} />
      );
    }

    const userId = otherUser?.employee_id || otherUser?.id?.toString() || chatRoom.id;
    const colors = getAvatarColor(userId);
    const initials = otherUser
      ? `${otherUser.first_name?.[0] || '?'}${otherUser.last_name?.[0] || ''}`
      : '?';

    return (
      <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: colors.light }]}>
        <Text style={[styles.avatarText, { color: colors.dark }]}>
          {initials}
        </Text>
      </View>
    );
  }, [chatRoom, currentUser]);

  const handleInputChange = (text: string) => {
    setInputText(text);
    onTyping();
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      onStopTyping();
    }, 1000);
  };

  const handleSend = () => {
    const text = inputText.trim();
    if (text) {
      inputRef.current?.clear();
      setInputText('');
      onSendMessage(text, 'text', undefined, replyingTo?.id);
      setReplyingTo(null);
      onStopTyping();
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    setInputText(prev => prev + emoji);
  };

  const handleEmojiPickerClose = () => {
    setShowEmojiPicker(false);
    setIsEmojiMode(false);
  };

  const isDeletedMessage = (message: Message) => {
    return message.content === "This message was deleted" || message.is_deleted === true;
  };

  // ── Guard: uploading or sending messages cannot be long-pressed ──
  const isMessageInteractionDisabled = (message: Message) => {
    return (
      isDeletedMessage(message) ||
      message.isUploading === true ||
      message.status === 'sending'
    );
  };

  const handleLongPress = (message: Message, event: any) => {
    if (isMessageInteractionDisabled(message)) return;
    if (selectedMessages.length > 0) return;
    setLongPressedMessage(message);
    setSelectedMessages([message.id as number]);
    if (messageRefs.current[String(message.id)]) {
      messageRefs.current[String(message.id)]?.measure((x, y, width, height, pageX, pageY) => {
        setReactionPosition({ x: pageX, y: pageY });
        setShowQuickReactions(true);
      });
    }
  };

  const handleMessageTap = (messageId: number | string) => {
    const message = messages.find(m => m.id === messageId);
    if (message && isMessageInteractionDisabled(message)) return;
    if (selectedMessages.length === 0) return;
    setSelectedMessages(prev => {
      if (prev.includes(messageId as number)) {
        const updated = prev.filter(id => id !== messageId);
        if (updated.length === 0) {
          setShowQuickReactions(false);
          setLongPressedMessage(null);
          setShowMessageOptionsModal(false);
        }
        return updated;
      } else {
        if (prev.length >= 1) {
          setShowQuickReactions(false);
          setShowMessageOptionsModal(false);
        }
        return [...prev, messageId as number];
      }
    });
  };

  const handleQuickReaction = (emoji: string) => {
    if (longPressedMessage) {
      onReact(longPressedMessage.id as number, emoji);
      setShowQuickReactions(false);
      setSelectedMessages([]);
      setLongPressedMessage(null);
      setShowMessageOptionsModal(false);
    }
  };

  const handleClearSelection = () => {
    setSelectedMessages([]);
    setShowQuickReactions(false);
    setLongPressedMessage(null);
    setShowMessageOptionsModal(false);
  };

  const canDeleteForEveryone = (message: Message) => {
    if (isDeletedMessage(message)) return false;
    const messageTime = new Date(message.created_at).getTime();
    const currentTime = new Date().getTime();
    const timeDiff = currentTime - messageTime;
    const thirtyMinutes = 30 * 60 * 1000;
    return timeDiff <= thirtyMinutes;
  };

  const handleDeleteMessage = () => {
    setShowDeleteModal(true);
  };

  const handleDeleteForEveryone = () => {
    setShowDeleteModal(false);
    Animated.timing(deleteModalSlide, {
      toValue: SCREEN_HEIGHT,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      selectedMessages.forEach(msgId => {
        if (!String(msgId).startsWith('temp_')) {
          onDeleteForEveryone(msgId);
        }
      });
      setSelectedMessages([]);
      setShowQuickReactions(false);
      setLongPressedMessage(null);
      setShowMessageOptionsModal(false);
    });
  };
  const isLongPressedMessageOwn = useMemo(() => {
    if (!longPressedMessage) return false;
    const currentUserId = currentUser.id || currentUser.employee_id;
    const senderId = longPressedMessage.sender.id || longPressedMessage.sender.employee_id;
    return senderId === currentUserId;
  }, [longPressedMessage, currentUser]);

  const handleDeleteForMe = () => {
    setShowDeleteModal(false);
    Animated.timing(deleteModalSlide, {
      toValue: SCREEN_HEIGHT,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      selectedMessages.forEach(msgId => {
        if (!String(msgId).startsWith('temp_')) {
          onDeleteForMe(msgId);
        }
      });
      setSelectedMessages([]);
      setShowQuickReactions(false);
      setLongPressedMessage(null);
      setShowMessageOptionsModal(false);
    });
  };

  const handleCancelDelete = () => {
    Animated.timing(deleteModalSlide, {
      toValue: SCREEN_HEIGHT,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setShowDeleteModal(false);
    });
  };

  useEffect(() => {
    if (showDeleteModal) {
      Animated.spring(deleteModalSlide, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 8,
      }).start();
    }
  }, [showDeleteModal]);

  const handleShareMessage = useCallback(() => {
    if (selectedMessages.length === 0) return;
    const messagesToShare = displayMessages.filter(msg =>
      selectedMessages.includes(msg.id as number) && !isDeletedMessage(msg)
    );
    if (onShare) {
      onShare(selectedMessages, messagesToShare, chatRoom?.id);
    } else {
      Alert.alert('Share', `Sharing ${selectedMessages.length} message(s)`);
      handleClearSelection();
    }
  }, [selectedMessages, displayMessages, chatRoom, onShare, handleClearSelection]);

  const handleReplyMessage = () => {
    if (longPressedMessage && !isDeletedMessage(longPressedMessage)) {
      setReplyingTo(longPressedMessage);
      handleClearSelection();
    }
  };

  const handleCopyMessage = () => {
    if (longPressedMessage && !isDeletedMessage(longPressedMessage) && longPressedMessage.message_type === 'text') {
      const contentToCopy = longPressedMessage.content;
      Clipboard.setString(contentToCopy);
      Alert.alert('Copied', 'Message text copied to clipboard');
      setShowMessageOptionsModal(false);
      handleClearSelection();
    }
  };

  const handleMessageInfo = () => {
    if (longPressedMessage && onMessageInfo) {
      onMessageInfo(longPressedMessage);
    }
    setShowMessageOptionsModal(false);
    handleClearSelection();
  };

  const handlePinMessage = () => {
    Alert.alert('Pinned', 'Message has been pinned');
    setShowMessageOptionsModal(false);
    handleClearSelection();
  };

  const handleTranslateMessage = () => {
    Alert.alert('Coming Soon', 'Translation feature will be available soon');
    setShowMessageOptionsModal(false);
    handleClearSelection();
  };

  const handleMessageOptionsPress = (event: any) => {
    if (selectedMessages.length === 1) {
      const topRightX = SCREEN_WIDTH - 220;
      const topRightY = Platform.OS === 'ios' ? 100 : 70;
      setMessageOptionsPosition({ x: topRightX, y: topRightY });
      setShowMessageOptionsModal(true);
    }
  };

  // ──────────────────────────────────────────────────────────
  // Scroll-to-parent + highlight
  // ──────────────────────────────────────────────────────────
  const scrollToMessage = useCallback((parentMessageId: number | string) => {
    const targetIdStr = String(parentMessageId);

    // messagesToDisplay is the inverted array shown to FlatList.
    // We built messageIndexMap to map id → index in that array.
    const index = messageIndexMap.current[targetIdStr];

    if (index === undefined) {
      // Message might be on a previous page; just show a toast-like alert for now
      console.warn('Parent message not in current list, index not found:', targetIdStr);
      return;
    }

    // Scroll to index (FlatList is inverted so index is correct)
    flatListRef.current?.scrollToIndex({
      index,
      animated: true,
      viewPosition: 0.5, // center in viewport
    });

    // Trigger highlight flash
    setHighlightedMessageId(parentMessageId);
    highlightAnim.setValue(1);

    Animated.sequence([
      Animated.delay(100),
      Animated.timing(highlightAnim, {
        toValue: 0,
        duration: 1200,
        useNativeDriver: false,
      }),
    ]).start(() => {
      setHighlightedMessageId(null);
    });
  }, [highlightAnim]);

  // ──────────────────────────────────────────────────────────
  // Camera helpers (unchanged)
  // ──────────────────────────────────────────────────────────
  const captureMultiplePhotos = async (accumulatedAssets = []) => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.length) {
        const newAssets = [...accumulatedAssets, ...result.assets];
        return new Promise((resolve) => {
          Alert.alert(
            'Add Another?',
            'Photo captured. Do you want to add another?',
            [
              { text: 'No', onPress: () => resolve(newAssets) },
              {
                text: 'Yes', onPress: async () => {
                  const moreAssets = await captureMultiplePhotos(newAssets);
                  resolve(moreAssets);
                }
              }
            ]
          );
        });
      }
      return accumulatedAssets;
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert('Error', 'Failed to capture photo.');
      return accumulatedAssets;
    }
  };

  const handleCameraPress = async () => {
    if (isPickingMedia) return;
    try {
      setIsPickingMedia(true);
      setShowAttachmentMenu(false);

      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Camera permission is required!');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.length > 0) {
        const asset = result.assets[0];
        setPreviewImageUri(asset.uri);
        setShowImagePreview(true);
      }
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert('Error', 'Failed to capture photo.');
    } finally {
      setIsPickingMedia(false);
    }
  };

  const handleSendFromPreview = (uri: string, caption: string) => {
    const fileData = {
      uri: uri,
      type: 'image/jpeg',
      name: `photo_${Date.now()}.jpg`,
    };
    onSendMessage(caption || fileData.name, 'image', fileData, replyingTo?.id);
    setReplyingTo(null);
    setShowImagePreview(false);
    setPreviewImageUri('');
  };

  const handleGalleryPress = async () => {
    if (isPickingMedia) return;
    try {
      setIsPickingMedia(true);
      setShowAttachmentMenu(false);

      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Gallery permission is required!');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsMultipleSelection: true,
        selectionLimit: 10,
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.length) {
        for (const asset of result.assets) {
          const isVideo = asset.type === 'video';
          const messageType = isVideo ? 'video' : 'image';
          const mimeType = isVideo ? 'video/mp4' : 'image/jpeg';
          const extension = isVideo ? 'mp4' : 'jpg';
          const fileData = {
            uri: asset.uri,
            type: mimeType,
            name: asset.fileName || `${messageType}_${Date.now()}.${extension}`,
          };
          onSendMessage(fileData.name, messageType, fileData, replyingTo?.id);
        }
        setReplyingTo(null);
      }
    } catch (error) {
      console.error('Gallery error:', error);
      Alert.alert('Error', 'Failed to select media.');
    } finally {
      setIsPickingMedia(false);
    }
  };

  const handleFileSelect = async () => {
    if (isPickingMedia) return;
    try {
      setIsPickingMedia(true);
      setShowAttachmentMenu(false);

      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
        multiple: true,
      });

      if (!result.canceled && result.assets?.length) {
        for (const asset of result.assets) {
          const fileData = {
            uri: asset.uri,
            type: asset.mimeType || 'application/octet-stream',
            name: asset.name || `document_${Date.now()}`,
          };
          onSendMessage(fileData.name, 'file', fileData, replyingTo?.id);
        }
        setReplyingTo(null);
      }
    } catch (error) {
      console.error('File selection error:', error);
      Alert.alert('Error', 'Failed to select file.');
    } finally {
      setIsPickingMedia(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });
    }
  };

  const shouldShowDateSeparator = (index: number, messagesArray: Message[]) => {
    if (index === messagesArray.length - 1) return true;
    const currentDate = new Date(messagesArray[index].created_at).toDateString();
    const nextDate = new Date(messagesArray[index + 1].created_at).toDateString();
    return currentDate !== nextDate;
  };

  const groupedReactions = (reactions: MessageReaction[]) => {
    const grouped: { [emoji: string]: User[] } = {};
    reactions.forEach(({ user, emoji }) => {
      if (!grouped[emoji]) grouped[emoji] = [];
      grouped[emoji].push(user);
    });
    return grouped;
  };

  const handleClearChatConfirm = () => {
    setShowClearChatConfirm(false);
    setShowOptionsModal(false);
    onClearChat();
  };

  const handleMuteChat = () => {
    setShowOptionsModal(false);
    if (chatRoom.is_muted) {
      if (onUnmute) {
        onUnmute();
        Alert.alert('Unmuted', 'Notifications turned on.', [{ text: 'OK' }]);
      }
    } else {
      setShowMuteSheet(true);
    }
  };

  const handleMuteOption = (duration: string, label: string) => {
    setShowMuteSheet(false);
    if (onMute) {
      onMute(duration);
      Alert.alert(
        'Notifications Muted',
        duration === 'always' ? 'Muted forever.' : `Muted for ${label}.`,
        [{ text: 'OK' }]
      );
    }
  };

  const handleSearchPress = () => {
    setIsSearchMode(true);
    setShowOptionsModal(false);
  };

  const handleSearchClose = () => {
    setIsSearchMode(false);
    setSearchText('');
    setSearchResults([]);
    setSearchOffset(0);
  };

  const handleSearchTextChange = (text: string) => {
    setSearchText(text);
    if (text.trim()) {
      setSearchOffset(0);
      setSearchResults([]);  // clear previous results
      setIsSearching(true);
      onSearch(text, 0, (results, hasMore) => {
        setSearchResults(results);
        setHasMoreSearchResults(hasMore);
        setIsSearching(false);
      });
    } else {
      setSearchResults([]);
      setIsSearching(false);
    }
  };

  const handleSearchLoadMore = () => {
    if (!isSearching && hasMoreSearchResults && searchText.trim()) {
      const newOffset = searchOffset + 20;
      setSearchOffset(newOffset);
      setIsSearching(true);
      onSearch(searchText, newOffset, (results, hasMore) => {
        setSearchResults(prev => [...prev, ...results]);
        setHasMoreSearchResults(hasMore);
        setIsSearching(false);
      });
    }
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyCircle}>
        <View style={styles.emptyInnerCircle}>
          <Ionicons name="chatbubbles-outline" size={48} color="#00a884" />
        </View>
      </View>
      <Text style={styles.emptyTitle}>Start a Conversation</Text>
      <Text style={styles.emptySubtitle}>
        Send your first message to begin chatting with{' '}
        {chatRoom.room_type === 'group' ? 'the group' : getChatName()}
      </Text>
      <View style={styles.emptyHintContainer}>
        <Ionicons name="arrow-down" size={20} color="#00a884" style={styles.emptyHintIcon} />
        <Text style={styles.emptyHintText}>Start typing below to send a message</Text>
      </View>
    </View>
  );

  const messagesToDisplay = useMemo(() => {
    const msgs = isSearchMode ? searchResults : displayMessages;
    return msgs;
  }, [isSearchMode, searchResults, displayMessages]);

  // Build index map whenever displayed messages change so scrollToIndex is accurate
  useEffect(() => {
    const map: { [key: string]: number } = {};
    messagesToDisplay.forEach((msg, idx) => {
      map[String(msg.id)] = idx;
    });
    messageIndexMap.current = map;
  }, [messagesToDisplay]);

  // ──────────────────────────────────────────────────────────
  // renderMessage
  // ──────────────────────────────────────────────────────────
  const renderMessage = ({ item: message, index }: { item: Message; index: number }) => {
    // ── System messages ────────────────────────────────────────────────────────
    if (message.message_type === 'system') {
      const showDate = shouldShowDateSeparator(index, messagesToDisplay);
      return (
        <>
          {showDate && (
            <View style={styles.dateSeparator}>
              <Text style={styles.dateSeparatorText}>
                {formatDate(message.created_at)}
              </Text>
            </View>
          )}
          <View style={styles.systemMessageContainer}>
            <Text style={styles.systemMessageText}>{message.content}</Text>
          </View>
        </>
      );
    }

    // ── Derived state ──────────────────────────────────────────────────────────
    const isOwnMessage =
      (message.sender.id || message.sender.employee_id) ===
      (currentUser.id || currentUser.employee_id);

    const showDate = shouldShowDateSeparator(index, messagesToDisplay);
    const reactions = groupedReactions(message.reactions || []);
    const isSelected = selectedMessages.includes(message.id as number);
    const isSelectionMode = selectedMessages.length > 0;
    const isDeleted = isDeletedMessage(message);

    const isUploading = message.isUploading === true;
    const isSending = message.status === 'sending' && !isUploading;
    const isFailed = message.status === 'failed';
    const effectiveStatus = getEffectiveStatus(message, currentUser, chatRoom);

    // Contact messages are never in an "uploading" state — they're pure JSON
    const isContact = message.message_type === 'contact';
    const interactionDisabled = isUploading || isSending || isDeleted;

    const isHighlighted = String(message.id) === String(highlightedMessageId);
    const highlightBg = highlightAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['rgba(0, 168, 132, 0)', 'rgba(0, 168, 132, 0.25)'],
    });

    const parentMsg = message.parent_message;
    const hasValidParent =
      parentMsg &&
      !isDeleted &&
      typeof parentMsg === 'object' &&
      parentMsg.sender;

    // ── Bubble content renderer ────────────────────────────────────────────────
    const renderBubbleContent = () => {
      // ── Deleted ──
      if (isDeleted) {
        return (
          <View style={styles.deletedMessageContent}>
            <Ionicons name="ban-outline" size={16} color="#8696a0" />
            <Text style={styles.deletedMessageText}>{message.content}</Text>
          </View>
        );
      }

      // ── Image ──
      if (message.message_type === 'image' && message.image_url) {
        return (
          <TouchableOpacity
            onPress={() => !isUploading && setSelectedImageUrl(message.image_url || null)}
            activeOpacity={isUploading ? 1 : 0.9}
            disabled={isUploading}
          >
            <View style={{ position: 'relative' }}>
              <Image
                source={{ uri: message.image_url }}
                style={styles.messageImage}
                resizeMode="cover"
              />
              {isUploading && (
                <View style={styles.mediaUploadingOverlay}>
                  <ActivityIndicator size="large" color="#ffffff" />
                </View>
              )}
            </View>
            {message.content && message.content !== message.file_name && (
              <Text style={styles.messageText}>{message.content}</Text>
            )}
          </TouchableOpacity>
        );
      }

      // ── Image placeholder (uploading, no URL yet) ──
      if (isUploading && message.message_type === 'image') {
        return (
          <View style={[styles.messageImage, styles.mediaUploadingPlaceholder]}>
            <ActivityIndicator size="large" color="#00a884" />
            <Text style={styles.uploadingText}>Uploading...</Text>
          </View>
        );
      }

      // ── Video ──
      if (message.message_type === 'video' && message.video_url) {
        return (
          <View style={styles.videoMessageContainer}>
            <TouchableOpacity
              style={styles.videoThumbnailContainer}
              onPress={() => !isUploading && setSelectedVideoUrl(message.video_url || null)}
              activeOpacity={isUploading ? 1 : 0.8}
              disabled={isUploading}
            >
              <Video
                source={{ uri: message.video_url }}
                style={styles.videoThumbnail}
                resizeMode={ResizeMode.COVER}
                shouldPlay={false}
                isMuted
                useNativeControls={false}
                posterSource={{ uri: message.video_url }}
                usePoster
              />
              <View style={styles.videoOverlay}>
                {isUploading ? (
                  <ActivityIndicator size="large" color="#ffffff" />
                ) : (
                  <View style={styles.playButtonContainer}>
                    <Ionicons name="play-circle" size={56} color="#ffffff" />
                  </View>
                )}
              </View>
              <View style={styles.videoDurationBadge}>
                <Ionicons name="videocam" size={12} color="#ffffff" />
              </View>
            </TouchableOpacity>
            {message.content && message.content !== message.file_name && (
              <Text style={styles.messageText}>{message.content}</Text>
            )}
          </View>
        );
      }

      // ── Video placeholder (uploading, no URL yet) ──
      if (isUploading && message.message_type === 'video') {
        return (
          <View style={styles.videoMessageContainer}>
            <View style={[styles.videoThumbnailContainer, styles.mediaUploadingPlaceholder]}>
              <ActivityIndicator size="large" color="#00a884" />
              <Text style={styles.uploadingText}>Uploading video...</Text>
            </View>
          </View>
        );
      }

      // ── Audio ──
      if (message.message_type === 'audio' && message.audio_url) {
        if (isUploading) {
          return (
            <View style={styles.audioUploadingContainer}>
              <ActivityIndicator size="small" color="#00a884" />
              <Text style={styles.uploadingText}>Uploading audio...</Text>
            </View>
          );
        }
        return (
          <AudioPlayer audioUrl={message.audio_url} isOwnMessage={isOwnMessage} />
        );
      }

      // ── Audio placeholder (uploading, no URL yet) ──
      if (isUploading && message.message_type === 'audio') {
        return (
          <View style={styles.audioUploadingContainer}>
            <ActivityIndicator size="small" color="#00a884" />
            <Text style={styles.uploadingText}>Uploading audio...</Text>
          </View>
        );
      }

      // ── File ──
      if (message.message_type === 'file' && message.file_url) {
        return (
          <TouchableOpacity
            style={styles.fileContainer}
            activeOpacity={0.7}
            onPress={() => {
              Linking.openURL(message.file_url!).catch(() =>
                Alert.alert('Error', 'Could not open file. Please try again.')
              );
            }}
          >
            <Ionicons name="document-attach" size={32} color="#00a884" />
            <View style={styles.fileInfo}>
              <Text style={styles.fileName} numberOfLines={1}>
                {message.file_name || message.content || 'File'}
              </Text>
              <Text style={styles.fileSize}>Tap to open</Text>
            </View>
          </TouchableOpacity>
        );
      }

      // ── File placeholder (uploading, no URL yet) ──
      if (isUploading && message.message_type === 'file') {
        return (
          <View style={styles.fileContainer}>
            <ActivityIndicator size="small" color="#00a884" />
            <View style={styles.fileInfo}>
              <Text style={styles.fileName} numberOfLines={1}>
                {message.content || 'Uploading file...'}
              </Text>
              <Text style={styles.fileSize}>Uploading...</Text>
            </View>
          </View>
        );
      }

      // ── Contact ──
      if (message.message_type === 'contact') {
        // contact_data is available (normal case)
        if (message.contact_data) {
          return (
            <ContactMessage
              contactData={message.contact_data as ContactData}
              isOwnMessage={isOwnMessage}
              onPress={() => handleViewContact(message.contact_data as ContactData)}
            />
          );
        }

        // contact_data missing — malformed or still sending
        return (
          <View style={styles.fileContainer}>
            {isSending ? (
              <ActivityIndicator size="small" color="#00a884" />
            ) : (
              <Ionicons name="person-outline" size={32} color="#00a884" />
            )}
            <View style={styles.fileInfo}>
              <Text style={styles.fileName} numberOfLines={1}>
                {message.content || 'Contact'}
              </Text>
              <Text style={styles.fileSize}>
                {isSending ? 'Sending...' : 'Contact'}
              </Text>
            </View>
          </View>
        );
      }

      // ── Text (default) ──
      if (message.message_type === 'text') {
        return <Text style={styles.messageText}>{message.content}</Text>;
      }

      return null;
    };

    // ── Full message node ──────────────────────────────────────────────────────
    const messageContent = (
      <View
        ref={ref => (messageRefs.current[String(message.id)] = ref)}
        style={[
          styles.messageWrapper,
          isOwnMessage ? styles.messageWrapperOwn : styles.messageWrapperOther,
          isSelected && styles.messageWrapperSelected,
          isDeleted && styles.messageWrapperDeleted,
        ]}
      >
        <TouchableOpacity
          style={[
            styles.messageTouchable,
            isOwnMessage
              ? styles.messageTouchableOwn
              : styles.messageTouchableOther,
          ]}
          onPress={() =>
            isSelectionMode && !interactionDisabled
              ? handleMessageTap(message.id)
              : null
          }
          onLongPress={e =>
            !interactionDisabled ? handleLongPress(message, e) : null
          }
          activeOpacity={
            interactionDisabled ? 1 : isSelectionMode ? 0.7 : 0.9
          }
          delayLongPress={interactionDisabled ? 0 : 500}
          disabled={isDeleted}
        >
          {/* ── Selection checkbox ── */}
          {isSelectionMode && !interactionDisabled && (
            <View style={styles.checkboxContainer}>
              <View
                style={[
                  styles.checkbox,
                  isSelected && styles.checkboxSelected,
                ]}
              >
                {isSelected && (
                  <Ionicons name="checkmark" size={16} color="#ffffff" />
                )}
              </View>
            </View>
          )}

          {/* ── Group sender avatar ── */}
          {!isOwnMessage &&
            chatRoom.room_type === 'group' &&
            !isSelectionMode &&
            !isDeleted && (
              <View style={styles.messageAvatar}>
                {message.sender.profile_picture ? (
                  <Image
                    source={{ uri: message.sender.profile_picture }}
                    style={styles.messageAvatarImage}
                  />
                ) : (
                  (() => {
                    const senderId =
                      message.sender.employee_id ||
                      message.sender.id?.toString() ||
                      '';
                    const colors = getAvatarColor(senderId);
                    return (
                      <View
                        style={[
                          styles.messageAvatarPlaceholder,
                          { backgroundColor: colors.light },
                        ]}
                      >
                        <Text
                          style={[
                            styles.messageAvatarText,
                            { color: colors.dark },
                          ]}
                        >
                          {message.sender.first_name?.[0] || '?'}
                        </Text>
                      </View>
                    );
                  })()
                )}
              </View>
            )}

          <View style={styles.messageContentWrapper}>
            {/* ── Reply context ── */}
            {hasValidParent && (
              <TouchableOpacity
                onPress={() => scrollToMessage(parentMsg!.id)}
                activeOpacity={0.7}
                style={styles.replyContext}
              >
                <View style={styles.replyBar} />
                <View style={styles.replyInfo}>
                  <Text style={styles.replySender}>
                    {(parentMsg!.sender.id || parentMsg!.sender.employee_id) ===
                      (currentUser.id || currentUser.employee_id)
                      ? 'You'
                      : parentMsg!.sender.first_name || 'Unknown'}
                  </Text>
                  <Text style={styles.replyPreview} numberOfLines={1}>
                    {parentMsg!.is_deleted
                      ? 'This message was deleted'
                      : (parentMsg!.content || '').substring(0, 50)}
                  </Text>
                </View>
              </TouchableOpacity>
            )}

            {/* ── Bubble ── */}
            <View
              style={[
                styles.messageBubble,
                isOwnMessage
                  ? styles.messageBubbleSent
                  : styles.messageBubbleReceived,
                isDeleted && styles.messageBubbleDeleted,
                isFailed && styles.messageBubbleFailed,
                // Contact cards manage their own padding — remove default bubble
                // padding so the card can fill edge-to-edge cleanly
                isContact && !isDeleted && styles.messageBubbleContact,
              ]}
            >
              {/* Forwarded indicator */}
              {message.is_forwarded && !isDeleted && (
                <View style={styles.forwardedIndicator}>
                  <Ionicons name="arrow-forward" size={12} color="#8696a0" />
                  <Text style={styles.forwardedText}>Forwarded</Text>
                </View>
              )}

              {/* Group sender name */}
              {!isOwnMessage &&
                chatRoom.room_type === 'group' &&
                !isDeleted &&
                !isContact && (
                  <Text
                    style={[styles.messageSenderName, { color: '#00a884' }]}
                  >
                    {message.sender.first_name}
                  </Text>
                )}

              {/* ── Actual content ── */}
              {renderBubbleContent()}

              {/* ── Meta row: time + status ── */}
              {/* Hide meta inside contact bubble — it sits below the card's CTA */}
              {!isContact && (
                <View style={styles.messageMeta}>
                  <Text
                    style={[
                      styles.messageTime,
                      isDeleted && styles.deletedMessageTime,
                    ]}
                  >
                    {formatTime(message.created_at)}
                  </Text>

                  {isOwnMessage && !isDeleted && (
                    isFailed ? (
                      <View style={styles.failedContainer}>
                        <Ionicons
                          name="alert-circle"
                          size={14}
                          color="#ea4335"
                        />
                        {onRetry && (
                          <TouchableOpacity
                            onPress={() => onRetry(String(message.id))}
                            style={styles.retryButton}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.retryText}>Retry</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    ) : (
                      <MessageStatusTick status={effectiveStatus} />
                    )
                  )}

                  {message.is_edited && !isDeleted && (
                    <Text style={styles.editedLabel}>edited</Text>
                  )}
                </View>
              )}
            </View>

            {/* Meta row for contact messages — rendered outside bubble */}
            {isContact && (
              <View style={[styles.messageMeta, styles.contactMeta]}>
                <Text style={styles.messageTime}>
                  {formatTime(message.created_at)}
                </Text>
                {isOwnMessage && !isDeleted && (
                  isFailed ? (
                    <View style={styles.failedContainer}>
                      <Ionicons name="alert-circle" size={14} color="#ea4335" />
                      {onRetry && (
                        <TouchableOpacity
                          onPress={() => onRetry(String(message.id))}
                          style={styles.retryButton}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.retryText}>Retry</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  ) : (
                    <MessageStatusTick status={effectiveStatus} />
                  )
                )}
              </View>
            )}

            {/* ── Reactions ── */}
            {Object.keys(reactions).length > 0 && !isDeleted && (
              <View style={styles.messageReactions}>
                {Object.entries(reactions).map(([emoji, users]) => (
                  <TouchableOpacity
                    key={emoji}
                    style={styles.reactionBubble}
                    onPress={() => onReact(message.id as number, emoji)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.reactionEmoji}>{emoji}</Text>
                    <Text style={styles.reactionCount}>{users.length}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>
    );

    // ── Swipeable + highlight wrapper ─────────────────────────────────────────
    const swipeableContent = (
      <SwipeableMessage
        isOwnMessage={isOwnMessage}
        onSwipeReply={() => {
          if (!interactionDisabled && !isSelectionMode) {
            setReplyingTo(message);
            inputRef.current?.focus();
          }
        }}
        disabled={interactionDisabled || isSelectionMode}
      >
        {messageContent}
      </SwipeableMessage>
    );

    return (
      <>
        {isHighlighted ? (
          <Animated.View
            style={{ backgroundColor: highlightBg, borderRadius: 4 }}
          >
            {swipeableContent}
          </Animated.View>
        ) : (
          swipeableContent
        )}

        {showDate && (
          <View style={styles.dateSeparator}>
            <Text style={styles.dateSeparatorText}>
              {formatDate(message.created_at)}
            </Text>
          </View>
        )}
      </>
    );
  };

  const handleEmojiButtonPress = () => {
    if (isEmojiMode) {
      setShowEmojiPicker(false);
      setIsEmojiMode(false);
      inputRef.current?.focus();
    } else {
      Keyboard.dismiss();
      setShowEmojiPicker(true);
      setIsEmojiMode(true);
    }
  };

  const bottomOffset = showEmojiPicker ? EMOJI_PICKER_HEIGHT : keyboardHeight;

  return (
    <ImageBackground
      source={require('../../assets/whatsappBackground.jpg')}
      style={styles.container}
      imageStyle={{ opacity: 0.4 }}
      resizeMode="cover"
    >
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Header */}
      <View style={[
        styles.header,
        selectedMessages.length > 0 && styles.headerWithSelection
      ]}>
        {selectedMessages.length > 0 ? (
          <>
            <TouchableOpacity style={styles.backButton} onPress={handleClearSelection} activeOpacity={0.7}>
              <Ionicons name="close" size={24} color="#000000" />
            </TouchableOpacity>
            <Text style={styles.selectionCount}>{selectedMessages.length}</Text>
            <View style={styles.selectionActions}>
              {selectedMessages.length === 1 && (
                <TouchableOpacity style={styles.selectionActionBtn} onPress={handleReplyMessage} activeOpacity={0.7}>
                  <MaterialIcons name="reply" size={24} color="#000000" />
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.selectionActionBtn} onPress={handleShareMessage} activeOpacity={0.7}>
                <Ionicons name="arrow-redo" size={24} color="#000000" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.selectionActionBtn} onPress={handleDeleteMessage} activeOpacity={0.7}>
                <Ionicons name="trash-outline" size={24} color="#000000" />
              </TouchableOpacity>
              {selectedMessages.length === 1 && (
                <TouchableOpacity style={styles.selectionActionBtn} onPress={handleMessageOptionsPress} activeOpacity={0.7}>
                  <Ionicons name="ellipsis-vertical" size={24} color="#000000" />
                </TouchableOpacity>
              )}
            </View>
          </>
        ) : isSearchMode ? (
          <>
            <TouchableOpacity style={styles.backButton} onPress={handleSearchClose} activeOpacity={0.7}>
              <Ionicons name="chevron-back" size={24} color="#000000" />
            </TouchableOpacity>
            <TextInput
              style={styles.searchInput}
              placeholder="Search messages..."
              placeholderTextColor="#8696a0"
              value={searchText}
              onChangeText={handleSearchTextChange}
              autoFocus
            />
          </>
        ) : (
          <>
            <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
              <Ionicons name="chevron-back" size={24} color="#000000" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerInfo} onPress={onHeaderClick} activeOpacity={0.7}>
              {getChatAvatar()}
              <View style={styles.headerText}>
                <View style={styles.headerNameRow}>
                  <Text style={styles.headerName} numberOfLines={1}>
                    {getChatName()}
                  </Text>
                  {chatRoom.is_muted && (
                    <Ionicons name="volume-mute" size={16} color="#000000" style={styles.mutedIcon} />
                  )}
                </View>
                <Text style={[styles.headerStatus, typingUsers.length > 0 && styles.typingIndicator]}>
                  {typingUsers.length > 0
                    ? (typingUsers.length === 1
                      ? `${typingUsers[0].first_name} is typing...`
                      : `${typingUsers.length} people are typing...`)
                    : chatRoom.room_type === 'group'
                      ? `${chatRoom.members.length} members`
                      : getOtherUserStatus() === 'online'
                        ? 'Online'
                        : 'Offline'}
                </Text>
              </View>
            </TouchableOpacity>
            <View style={styles.headerActions}>
              <TouchableOpacity style={styles.headerIconBtn} onPress={() => setShowOptionsModal(true)} activeOpacity={0.7}>
                <Ionicons name="ellipsis-vertical" size={24} color="#000000" />
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      {/* Messages List or Empty State */}
      {messagesToDisplay.length === 0 && !isLoading && !isSearchMode ? (
        renderEmptyState()
      ) : messagesToDisplay.length === 0 && isSearchMode ? (
        <View style={styles.searchEmptyContainer}>
          <Ionicons name="search-outline" size={64} color="#8696a0" />
          <Text style={styles.searchEmptyText}>No messages found</Text>
          <Text style={styles.searchEmptySubtext}>Try different keywords</Text>
        </View>
      ) : (
        // <FlatList
        //   ref={flatListRef}
        //   data={messagesToDisplay}
        //   renderItem={renderMessage}
        //   keyboardDismissMode="on-drag"
        //   keyExtractor={(item, index) => {
        //     if (item?.id != null) {
        //       return item.id.toString();
        //     }
        //     return `msg-${index}-${item?.created_at || Date.now()}`;
        //   }}
        //   style={[styles.messagesList, { marginBottom: bottomOffset + INPUT_CONTAINER_HEIGHT }]}
        //   contentContainerStyle={[
        //     styles.messagesContent,
        //     {
        //       paddingBottom: INPUT_CONTAINER_HEIGHT + bottomOffset + 10,
        //     },
        //   ]}
        //   inverted={true}
        //   onEndReached={isSearchMode ? handleSearchLoadMore : onLoadMore}
        //   onEndReachedThreshold={0.5}
        //   onScrollToIndexFailed={(info) => {
        //     // Fallback: wait a tick then try offset-based scroll
        //     const wait = new Promise(resolve => setTimeout(resolve, 500));
        //     wait.then(() => {
        //       flatListRef.current?.scrollToIndex({
        //         index: info.index,
        //         animated: true,
        //         viewPosition: 0.5,
        //       });
        //     });
        //   }}
        //   ListFooterComponent={
        //     isLoading || isSearching ? (
        //       <View style={styles.loadingIndicator}>
        //         <ActivityIndicator size="small" color="#00a884" />
        //       </View>
        //     ) : null
        //   }
        //   keyboardShouldPersistTaps="handled"
        //   maintainVisibleContentPosition={
        //     Platform.OS === 'ios'
        //       ? {
        //         minIndexForVisible: 0,
        //         autoscrollToTopThreshold: 10,
        //       }
        //       : undefined
        //   }
        // />
        // In Chat component, update FlatList:
        <FlatList
          ref={flatListRef}
          data={messagesToDisplay} 
          keyboardDismissMode="on-drag"
          renderItem={renderMessage}
          keyExtractor={item => item.id.toString()}
          inverted={true}  // Keep inverted
          onScroll={onScroll}  // NEW: Forward scroll
          scrollEventThrottle={400}  // NEW
          onEndReached={onLoadMore}  // NEW: Load older when scrolling up
          onEndReachedThreshold={0.2}  // NEW
          ListHeaderComponent={  // Header because inverted
            hasMore && isLoading ? (
              <View style={styles.loadingIndicator}>
                <ActivityIndicator size="small" color="#00a884" />
                <Text style={styles.loadingText}>Loading older messages...</Text>
              </View>
            ) : null
          }
          style={[styles.messagesList, { marginBottom: bottomOffset + INPUT_CONTAINER_HEIGHT }]}
          contentContainerStyle={[
            styles.messagesContent,
            {
              paddingBottom: INPUT_CONTAINER_HEIGHT + bottomOffset + 50,
            },
          ]}
          ListFooterComponent={
            isLoading || isSearching ? (
              <View style={styles.loadingIndicator}>
                <ActivityIndicator size="small" color="#00a884" />
              </View>
            ) : null
          }
          keyboardShouldPersistTaps="handled"
           maintainVisibleContentPosition={
            Platform.OS === 'ios'
              ? {
                minIndexForVisible: 0,
                autoscrollToTopThreshold: 10,
              }
              : undefined
          }
        />
      )}

      {/* Floating Quick Reactions Bar */}
      {showQuickReactions && selectedMessages.length === 1 && (
        <Animated.View
          style={[
            styles.floatingReactionsContainer,
            {
              top: reactionPosition.y - 60,
              left: reactionPosition.x,
              opacity: reactionBarOpacity,
              transform: [{ scale: reactionBarScale }],
            },
          ]}
        >
          <View style={styles.floatingReactionsBar}>
            {QUICK_REACTIONS.map((emoji, index) => (
              <TouchableOpacity
                key={emoji}
                style={[
                  styles.floatingReactionBtn,
                  index === 0 && styles.floatingReactionBtnFirst,
                  index === QUICK_REACTIONS.length - 1 && styles.floatingReactionBtnLast,
                ]}
                onPress={() => handleQuickReaction(emoji)}
                activeOpacity={0.7}
              >
                <Text style={styles.floatingReactionEmoji}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.reactionTail} />
        </Animated.View>
      )}

      {/* Reply Bar */}
      {replyingTo && (
        <View style={[styles.replyBarContainer, { bottom: INPUT_CONTAINER_HEIGHT + bottomOffset }]}>
          <View style={styles.replyBarContent}>
            <View style={styles.replyBarLeft}>
              <View style={styles.replyBarLine} />
              <View>
                <Text style={styles.replyToText}>
                  Replying to{' '}
                  {(replyingTo.sender.id || replyingTo.sender.employee_id) === (currentUser.id || currentUser.employee_id)
                    ? 'yourself'
                    : replyingTo.sender.first_name}
                </Text>
                <Text style={styles.replyPreview} numberOfLines={1}>
                  {(replyingTo.content || '').substring(0, 50)}
                </Text>
              </View>
            </View>
            <TouchableOpacity style={styles.replyClose} onPress={() => setReplyingTo(null)} activeOpacity={0.7}>
              <Ionicons name="close" size={24} color="#8696a0" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Input Container */}
      {!isSearchMode && !isBlocked && (
        <View style={[
          styles.inputContainer,
          {
            position: 'absolute',
            bottom: bottomOffset,
            left: 0,
            right: 0,
          }
        ]}>
          <View style={styles.inputRow}>
            <TouchableOpacity
              style={styles.inputIconBtn}
              onPress={handleEmojiButtonPress}
              activeOpacity={0.7}
            >
              <Ionicons
                name={isEmojiMode ? "keypad-outline" : "happy-outline"}
                size={24}
                color="#8696a0"
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.inputIconBtn}
              onPress={() => {
                setCameraMode('picture');
                setShowCameraRecorder(true);
              }}
              onLongPress={() => {
                setCameraMode('video');
                setShowCameraRecorder(true);
              }}
              activeOpacity={0.7}
              disabled={isPickingMedia}
            >
              <Ionicons
                name="camera-outline"
                size={24}
                color={isPickingMedia ? "#d1d5db" : "#8696a0"}
              />
            </TouchableOpacity>

            <TextInput
              ref={inputRef}
              style={styles.messageInput}
              placeholder="Message"
              placeholderTextColor="#8696a0"
              value={inputText}
              onChangeText={handleInputChange}
              multiline
              onFocus={() => {
                if (isEmojiMode) {
                  setShowEmojiPicker(false);
                  setIsEmojiMode(false);
                }
              }}
            />
            <TouchableOpacity
              style={styles.inputIconBtn}
              onPress={() => setShowAttachmentMenu(!showAttachmentMenu)}
              activeOpacity={0.7}
              disabled={isPickingMedia}
            >
              <Ionicons name="attach" size={24} color="#8696a0" />
            </TouchableOpacity>
            {inputText.trim() ? (
              <TouchableOpacity style={styles.sendButton} onPress={handleSend} activeOpacity={0.7}>
                <Ionicons name="send" size={20} color="#ffffff" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.inputIconBtn}
                onPress={() => setShowAudioRecorder(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="mic" size={24} color="#8696a0" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {!isSearchMode && isBlocked && (
        <View style={styles.blockedContainer}>
          <Ionicons name="ban" size={24} color="#8696a0" />
          <Text style={styles.blockedText}>
            {isBlockedByMe
              ? 'You blocked this contact. Unblock to send messages.'
              : 'You cannot send messages to this contact.'}
          </Text>
          {isBlockedByMe && (
            <TouchableOpacity
              style={styles.unblockButton}
              onPress={() => {
                onHeaderClick();
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.unblockButtonText}>Unblock</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Attachment Menu */}
      <AttachmentMenu
        visible={showAttachmentMenu}
        onClose={() => setShowAttachmentMenu(false)}
        onCameraPress={() => {
          setShowAttachmentMenu(false);
          setCameraMode('photo');
          setShowCameraRecorder(true);
        }}
        onVideoPress={() => {
          setShowAttachmentMenu(false);
          setCameraMode('video');
          setShowCameraRecorder(true);
        }}
        onGalleryPress={handleGalleryPress}
        onFilePress={handleFileSelect}
        onAudioPress={() => {
          setShowAttachmentMenu(false);
          setShowAudioRecorder(true);
        }}
        onContactPress={onContactPress || (() => { })}
      />

      {/* Emoji Picker */}
      {showEmojiPicker && (
        <EmojiPicker
          visible={showEmojiPicker}
          onSelect={handleEmojiSelect}
          onClose={handleEmojiPickerClose}
        />
      )}

      {/* WhatsApp-Style Message Options Modal */}
      {showMessageOptionsModal && (
        <Modal transparent visible={showMessageOptionsModal} animationType="none">
          <TouchableOpacity
            style={styles.messageOptionsOverlay}
            activeOpacity={1}
            onPress={() => setShowMessageOptionsModal(false)}
          >
            <Animated.View
              style={[
                styles.messageOptionsDropdown,
                {
                  top: messageOptionsPosition.y,
                  left: messageOptionsPosition.x,
                  opacity: messageOptionsOpacity,
                  transform: [{ scale: messageOptionsScale }],
                },
              ]}
            >
              <TouchableOpacity style={styles.messageOptionItem} onPress={handleCopyMessage} activeOpacity={0.7}>
                <Ionicons name="copy-outline" size={20} color="#3b4a54" />
                <Text style={styles.messageOptionText}>Copy</Text>
              </TouchableOpacity>
              {isLongPressedMessageOwn && (
                <>
                  <View style={styles.messageOptionDivider} />
                  <TouchableOpacity style={styles.messageOptionItem} onPress={handleMessageInfo} activeOpacity={0.7}>
                    <Ionicons name="information-circle-outline" size={20} color="#3b4a54" />
                    <Text style={styles.messageOptionText}>Info</Text>
                  </TouchableOpacity>
                </>
              )}
              {/* DO NOT DELETE BELOW EVER DO NOT DELETE!!!!!!!!!!!!!! */}
              {/* <View style={styles.messageOptionDivider} /> */}
              {/* <TouchableOpacity style={styles.messageOptionItem} onPress={handlePinMessage} activeOpacity={0.7}>
                <Ionicons name="pin-outline" size={20} color="#3b4a54" />
                <Text style={styles.messageOptionText}>Pin</Text>
              </TouchableOpacity>
              <View style={styles.messageOptionDivider} />
              <TouchableOpacity style={styles.messageOptionItem} onPress={handleTranslateMessage} activeOpacity={0.7}>
                <Ionicons name="language-outline" size={20} color="#3b4a54" />
                <Text style={styles.messageOptionText}>Translate</Text>
              </TouchableOpacity> */}
              {/* DO NOT DELETE ABOVE EVER DO NOT DELETE!!!!!!!!!!!!!! */}
            </Animated.View>
          </TouchableOpacity>
        </Modal>
      )}

      {/* Delete Modal */}
      <Modal transparent visible={showDeleteModal} animationType="none">
        <View style={styles.deleteModalOverlay}>
          <TouchableOpacity
            style={styles.deleteModalBackdrop}
            activeOpacity={1}
            onPress={handleCancelDelete}
          />
          <Animated.View
            style={[
              styles.deleteModalContent,
              { transform: [{ translateY: deleteModalSlide }] },
            ]}
          >
            <View style={styles.deleteModalHeader}>
              <Text style={styles.deleteModalTitle}>
                Delete {selectedMessages.length} {selectedMessages.length === 1 ? 'message' : 'messages'}?
              </Text>
            </View>
            <TouchableOpacity style={styles.deleteModalOption} onPress={handleDeleteForMe} activeOpacity={0.7}>
              <View style={styles.deleteModalOptionContent}>
                <Ionicons name="trash-outline" size={24} color="#111b21" />
                <View style={styles.deleteModalOptionText}>
                  <Text style={styles.deleteModalOptionTitle}>Delete for me</Text>
                  <Text style={styles.deleteModalOptionSubtitle}>
                    {selectedMessages.length === 1 ? 'This message' : 'These messages'} will be removed from this device
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
            {isLongPressedMessageOwn && longPressedMessage && canDeleteForEveryone(longPressedMessage) && (
              <TouchableOpacity style={styles.deleteModalOption} onPress={handleDeleteForEveryone} activeOpacity={0.7}>
                <View style={styles.deleteModalOptionContent}>
                  <Ionicons name="trash-bin-outline" size={24} color="#ea4335" />
                  <View style={styles.deleteModalOptionText}>
                    <Text style={[styles.deleteModalOptionTitle, { color: '#ea4335' }]}>Delete for everyone</Text>
                    <Text style={styles.deleteModalOptionSubtitle}>
                      {selectedMessages.length === 1 ? 'This message' : 'These messages'} will be removed for all participants
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.deleteModalCancel} onPress={handleCancelDelete} activeOpacity={0.7}>
              <Text style={styles.deleteModalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </Animated.View>


        </View>
      </Modal>

      {/* Options Modal */}
      <Modal transparent visible={showOptionsModal} animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowOptionsModal(false)}
        >
          <View style={styles.modalContent}>
            <TouchableOpacity style={styles.modalMenuItem} onPress={handleSearchPress} activeOpacity={0.7}>
              <Text style={styles.modalMenuText}>Search</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalMenuItem}
              onPress={() => { setShowOptionsModal(false); setShowClearChatConfirm(true); }}
              activeOpacity={0.7}
            >
              <Text style={styles.modalMenuText}>Clear Chat</Text>
            </TouchableOpacity>
            {/* Mute / Unmute — now shows correct label */}
            <TouchableOpacity style={styles.modalMenuItem} onPress={handleMuteChat} activeOpacity={0.7}>
              <Text style={styles.modalMenuText}>
                {chatRoom.is_muted ? 'Unmute notifications' : 'Mute notifications'}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Clear Chat Confirmation */}
      <Modal transparent visible={showClearChatConfirm} animationType="fade">
        <View style={styles.deleteModalOverlay}>
          <TouchableOpacity
            style={styles.deleteModalBackdrop}
            activeOpacity={1}
            onPress={() => setShowClearChatConfirm(false)}
          />
          <View style={styles.clearChatModal}>
            <Text style={styles.clearChatTitle}>Clear Chat?</Text>
            <Text style={styles.clearChatText}>
              All messages will be deleted for you only. This action cannot be undone.
            </Text>
            <View style={styles.clearChatButtons}>
              <TouchableOpacity
                style={styles.clearChatCancel}
                onPress={() => setShowClearChatConfirm(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.clearChatCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.clearChatConfirm}
                onPress={handleClearChatConfirm}
                activeOpacity={0.7}
              >
                <Text style={styles.clearChatConfirmText}>Clear</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={!!selectedImageUrl} transparent animationType="fade">
        <View style={styles.imageViewerContainer}>
          <TouchableOpacity
            style={styles.imageViewerClose}
            onPress={() => setSelectedImageUrl(null)}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={32} color="#ffffff" />
          </TouchableOpacity>
          {selectedImageUrl && (
            <Image
              source={{ uri: selectedImageUrl }}
              style={styles.imageViewerImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
      <ImagePreview
        visible={showImagePreview}
        imageUri={previewImageUri}
        onClose={() => {
          setShowImagePreview(false);
          setPreviewImageUri('');
        }}
        onSend={handleSendFromPreview}
      />
      <VideoPlayer
        visible={!!selectedVideoUrl}
        videoUri={selectedVideoUrl || ''}
        onClose={() => setSelectedVideoUrl(null)}
      />
      <CameraRecorder
        visible={showCameraRecorder}
        mode={cameraMode}
        onClose={() => setShowCameraRecorder(false)}
        onCapture={handleCameraCapture}
      />
      <AudioRecorder
        visible={showAudioRecorder}
        onClose={() => setShowAudioRecorder(false)}
        onSend={handleAudioCapture}
      />
      {/* Mute Duration Sheet */}
      <Modal
        transparent
        visible={showMuteSheet}
        animationType="slide"
        onRequestClose={() => setShowMuteSheet(false)}
      >
        <Pressable style={muteSheetStyles.overlay} onPress={() => setShowMuteSheet(false)}>
          <View style={muteSheetStyles.sheet}>
            <View style={muteSheetStyles.header}>
              <Text style={muteSheetStyles.title}>Mute notifications for…</Text>
            </View>
            <TouchableOpacity style={muteSheetStyles.option} onPress={() => handleMuteOption('8h', '8 hours')} activeOpacity={0.7}>
              <Text style={muteSheetStyles.optionText}>8 hours</Text>
            </TouchableOpacity>
            <TouchableOpacity style={muteSheetStyles.option} onPress={() => handleMuteOption('24h', '24 hours')} activeOpacity={0.7}>
              <Text style={muteSheetStyles.optionText}>24 hours</Text>
            </TouchableOpacity>
            <TouchableOpacity style={muteSheetStyles.option} onPress={() => handleMuteOption('always', 'always')} activeOpacity={0.7}>
              <Text style={muteSheetStyles.optionText}>Always</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[muteSheetStyles.option, muteSheetStyles.cancel]} onPress={() => setShowMuteSheet(false)} activeOpacity={0.7}>
              <Text style={muteSheetStyles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      <ContactDetail
        visible={contactDetailVisible}
        contactData={detailContact}
        onClose={() => {
          setContactDetailVisible(false);
          setDetailContact(null);
        }}
      />
    </ImageBackground>
  );
};
const muteSheetStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#ffffff', borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingBottom: 28 },
  header: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#e9edef' },
  title: { fontSize: 16, fontWeight: '600', color: '#111b21', textAlign: 'center' },
  option: { paddingVertical: 16, paddingHorizontal: 20, borderBottomWidth: 0.5, borderBottomColor: '#e9edef' },
  optionText: { fontSize: 16, color: '#111b21' },
  cancel: { borderBottomWidth: 0, marginTop: 8 },
  cancelText: { fontSize: 16, color: '#00a884', fontWeight: '600', textAlign: 'center' },
});
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#efeae2',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingTop: 90,
    paddingBottom: 10,
    paddingHorizontal: 16,
    gap: 12,
    borderBottomWidth: 0,
    marginTop: Platform.OS === 'ios' ? -80 : -50,
  },
  headerWithSelection: {
    backgroundColor: '#ffffff',
  },
  backButton: {
    padding: 8,
  },
  selectionCount: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginLeft: 8,
  },
  selectionActions: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 16,
  },
  selectionActionBtn: {
    padding: 8,
  },
  headerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minWidth: 0,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '600',
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  headerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    flex: 1,
  },
  mutedIcon: {
    marginLeft: 4,
  },
  headerStatus: {
    fontSize: 13,
    color: '#000000',
    marginTop: 2,
  },
  typingIndicator: {
    color: '#00a884',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerIconBtn: {
    padding: 8,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 15,
    color: '#111b21',
  },
  messagesList: {
    flex: 1,
    marginBottom: 50
  },
  messagesContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#efeae2',
    paddingHorizontal: 40,
    paddingBottom: 100,
  },
  emptyCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(0, 168, 132, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  emptyInnerCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(0, 168, 132, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#111b21',
    marginBottom: 10,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#667781',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 30,
  },
  emptyHintContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 20,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  emptyHintIcon: {
    marginRight: 10,
  },
  emptyHintText: {
    fontSize: 14,
    color: '#667781',
    fontWeight: '500',
  },
  searchEmptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#efeae2',
    paddingBottom: 100,
  },
  searchEmptyText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#667781',
    marginTop: 20,
    marginBottom: 8,
  },
  searchEmptySubtext: {
    fontSize: 14,
    color: '#8696a0',
  },
  loadingIndicator: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  dateSeparator: {
    alignItems: 'center',
    marginVertical: 16,
  },
  dateSeparatorText: {
    backgroundColor: '#ffffff',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    fontSize: 12.5,
    color: '#667781',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  messageWrapper: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'flex-end',
    gap: 8,
  },
  messageWrapperOwn: {
    flexDirection: 'row-reverse',
  },
  messageWrapperOther: {
    flexDirection: 'row',
  },
  messageWrapperSelected: {
    backgroundColor: '#cef5e4',
    marginHorizontal: -8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  messageWrapperDeleted: {
    opacity: 0.8,
  },
  messageTouchable: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    flex: 1,
  },
  messageTouchableOwn: {
    flexDirection: 'row-reverse',
  },
  messageTouchableOther: {
    flexDirection: 'row',
  },
  checkboxContainer: {
    justifyContent: 'center',
    paddingRight: 8,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#8696a0',
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#00a884',
    borderColor: '#00a884',
  },
  messageAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    overflow: 'hidden',
  },
  messageAvatarImage: {
    width: '100%',
    height: '100%',
  },
  messageAvatarPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageAvatarText: {
    fontSize: 12,
    fontWeight: '600',
  },
  messageContentWrapper: {
    maxWidth: '75%',
  },
  replyContext: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderLeftWidth: 4,
    borderLeftColor: '#00a884',
    padding: 6,
    marginBottom: 4,
    borderRadius: 4,
    gap: 8,
    paddingLeft: 1,
    minWidth: 160
  },
  replyBar: {
    width: 4,
    borderRadius: 2,
  },
  replyInfo: {
    flex: 1,
  },
  replySender: {
    fontSize: 13,
    fontWeight: '600',
    color: '#00a884',
    marginBottom: 2,
  },
  replyPreview: {
    fontSize: 13,
    color: '#667781',
  },
  messageBubble: {
    padding: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 0.5,
    elevation: 1,
  },
  messageBubbleReceived: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 0,
  },
  messageBubbleSent: {
    backgroundColor: '#d9fdd3',
    borderTopRightRadius: 0,
  },
  messageBubbleDeleted: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderColor: 'rgba(0, 0, 0, 0.1)',
    borderWidth: 1,
  },
  // ── NEW: failed message bubble ──
  messageBubbleFailed: {
    borderWidth: 1,
    borderColor: '#ea4335',
    opacity: 0.85,
  },
  messageSenderName: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 14.2,
    lineHeight: 19,
    color: '#111b21',
  },
  deletedMessageContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  deletedMessageText: {
    fontSize: 14,
    color: '#8696a0',
    fontStyle: 'italic',
  },
  deletedMessageTime: {
    color: '#8696a0',
    opacity: 0.7,
  },
  messageMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  messageTime: {
    fontSize: 11,
    color: '#8696a0',
  },
  messageStatus: {
    marginLeft: 2,
  },
  editedLabel: {
    fontSize: 11,
    color: '#8696a0',
    fontStyle: 'italic',
  },
  // ── NEW: failed + retry styles ──
  failedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 4,
  },
  retryButton: {
    backgroundColor: '#ea4335',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  retryText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
  },
  // ── NEW: uploading overlay styles ──
  mediaUploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaUploadingPlaceholder: {
    backgroundColor: '#e9edef',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    minHeight: 100,
  },
  uploadingText: {
    fontSize: 12,
    color: '#667781',
    marginTop: 8,
    textAlign: 'center',
  },
  audioUploadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 4,
    minWidth: 150,
  },
  messageReactions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 4,
  },
  reactionBubble: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e9edef',
    borderRadius: 12,
    paddingVertical: 2,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reactionEmoji: {
    fontSize: 14,
  },
  reactionCount: {
    fontSize: 12,
    color: '#667781',
    fontWeight: '500',
  },
  floatingReactionsContainer: {
    position: 'absolute',
    zIndex: 1000,
  },
  floatingReactionsBar: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 28,
    paddingVertical: 6,
    paddingHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  floatingReactionBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
  },
  floatingReactionBtnFirst: {
    marginLeft: 2,
  },
  floatingReactionBtnLast: {
    marginRight: 2,
  },
  floatingReactionEmoji: {
    fontSize: 26,
  },
  reactionTail: {
    position: 'absolute',
    bottom: -6,
    left: '50%',
    marginLeft: -6,
    width: 12,
    height: 12,
    backgroundColor: '#ffffff',
    transform: [{ rotate: '45deg' }],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  replyBarContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: '#f0f2f5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e9edef',
  },
  replyBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  replyBarLeft: {
    flex: 1,
    flexDirection: 'row',
    gap: 12,
  },
  replyBarLine: {
    width: 4,
    backgroundColor: '#00a884',
    borderRadius: 2,
  },
  replyToText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#00a884',
    marginBottom: 2,
  },
  replyClose: {
    padding: 8,
  },
  inputContainer: {
    backgroundColor: '#f0f2f5',
    paddingHorizontal: 8,
    paddingVertical: 8,
    zIndex: 2,
    marginBottom: 0
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  inputIconBtn: {
    padding: 4,
  },
  messageInput: {
    flex: 1,
    fontSize: 15,
    color: '#111b21',
    maxHeight: 100,
    paddingVertical: 4,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#00a884',
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageOptionsOverlay: {
    position: 'absolute',
    top: -20,
    left: 40,
    right: 0,
    bottom: 0,
    zIndex: 9999,
  },
  messageOptionsDropdown: {
    position: 'absolute',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    minWidth: 180,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.24,
    shadowRadius: 8,
    elevation: 12,
  },
  messageOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 16,
  },
  messageOptionText: {
    fontSize: 14.5,
    color: '#3b4a54',
    fontWeight: '400',
    letterSpacing: 0.1,
  },
  messageOptionDivider: {
    height: 0.5,
    backgroundColor: '#e9edef',
    marginHorizontal: 8,
  },
  deleteModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteModalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  deleteModalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  deleteModalHeader: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9edef',
  },
  deleteModalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111b21',
  },
  deleteModalOption: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9edef',
  },
  deleteModalOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  deleteModalOptionText: {
    flex: 1,
  },
  deleteModalOptionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111b21',
    marginBottom: 4,
  },
  deleteModalOptionSubtitle: {
    fontSize: 13,
    color: '#667781',
    lineHeight: 18,
  },
  deleteModalCancel: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    alignItems: 'center',
  },
  deleteModalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#00a884',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: Platform.OS === 'ios' ? 80 : 60,
    paddingRight: 8,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    minWidth: 220,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalMenuItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f2f5',
  },
  modalMenuText: {
    fontSize: 15,
    color: '#111b21',
    fontWeight: '400',
  },
  clearChatModal: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 24,
    width: SCREEN_WIDTH * 0.85,
    maxWidth: 400,
  },
  clearChatTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111b21',
    marginBottom: 12,
  },
  clearChatText: {
    fontSize: 15,
    color: '#667781',
    lineHeight: 21,
    marginBottom: 24,
  },
  clearChatButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  clearChatCancel: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#f0f2f5',
    alignItems: 'center',
  },
  clearChatCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111b21',
  },
  clearChatConfirm: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#ea4335',
    alignItems: 'center',
  },
  clearChatConfirmText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
  forwardedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
    paddingBottom: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  forwardedText: {
    fontSize: 11,
    color: '#8696a0',
    fontStyle: 'italic',
    fontWeight: '400',
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 8,
    marginBottom: 4,
  },
  fileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'rgba(0, 168, 132, 0.1)',
    borderRadius: 8,
    gap: 12,
    minWidth: 200,
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111b21',
    marginBottom: 2,
  },
  fileSize: {
    fontSize: 12,
    color: '#667781',
  },
  imageViewerContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageViewerClose: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    right: 20,
    zIndex: 1,
    padding: 8,
  },
  imageViewerImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.8,
  },
  videoMessageContainer: {
    maxWidth: 250,
    width: 200,
    overflow: 'hidden',
  },
  videoThumbnailContainer: {
    width: '100%',
    height: 180,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  videoThumbnail: {
    width: '100%',
    height: '100%',
  },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButtonContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(0, 168, 132, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  videoPlayIcon: {
    position: 'absolute',
  },
  videoPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoDurationBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  blockedContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#f0f2f5',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#e9edef',
  },
  blockedText: {
    fontSize: 14,
    color: '#667781',
    flex: 1,
  },
  unblockButton: {
    backgroundColor: '#00a884',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  unblockButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  systemMessageContainer: {
    alignItems: 'center',
    marginVertical: 8,
    paddingHorizontal: 16,
  },
  systemMessageText: {
    backgroundColor: '#d1e7fd',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    fontSize: 12.5,
    color: '#054a91',
    textAlign: 'center',
    maxWidth: '80%',
  },
  videoContainer: {
    width: 200,
    height: 200,
    borderRadius: 8,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  messageBubbleContact: {
    // Remove default padding so ContactMessage card fills flush to bubble edges
    padding: 0,
    overflow: 'hidden',
  },
  contactMeta: {
    // Sits just below the contact card, aligned to the trailing edge
    marginTop: 4,
    paddingHorizontal: 4,
  },
});