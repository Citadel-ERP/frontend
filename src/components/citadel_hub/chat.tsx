import React, { useState, useRef, useEffect } from 'react';
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
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EmojiPicker } from './emojiPicker';
import { AttachmentMenu } from './attachmentMenu';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';

interface User {
  id: number;
  first_name: string;
  last_name: string;
  profile_picture?: string;
}

interface Message {
  id: number;
  sender: User;
  content: string;
  message_type: 'text' | 'image' | 'file' | 'audio' | 'video';
  created_at: string;
  is_edited: boolean;
  parent_message?: Message;
  reactions?: Array<{ user: User; emoji: string }>;
  file_url?: string;
  file_name?: string;
}

interface ChatRoom {
  id: number;
  name?: string;
  room_type: 'direct' | 'group';
  profile_picture?: string;
  members: User[];
}

interface ChatProps {
  chatRoom: ChatRoom;
  messages: Message[];
  currentUser: User;
  typingUsers: User[];
  onBack: () => void;
  onHeaderClick: () => void;
  onSendMessage: (content: string, type?: string, file?: any, parentId?: number) => void;
  onTyping: () => void;
  onStopTyping: () => void;
  onReact: (messageId: number, emoji: string) => void;
  onLoadMore: () => void;
  hasMore: boolean;
  isLoading: boolean;
}

export const Chat: React.FC<ChatProps> = ({
  chatRoom,
  messages,
  currentUser,
  typingUsers,
  onBack,
  onHeaderClick,
  onSendMessage,
  onTyping,
  onStopTyping,
  onReact,
  onLoadMore,
  hasMore,
  isLoading,
}) => {
  const [inputText, setInputText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<number | null>(null);
  
  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  const getChatName = () => {
    if (chatRoom.room_type === 'group') {
      return chatRoom.name || 'Unnamed Group';
    }
    const otherUser = chatRoom.members.find(m => m.id !== currentUser.id);
    return otherUser ? `${otherUser.user.first_name || 'Unknown'} ${otherUser.last_name || ''}` : 'Unknown';
  };

  const getChatAvatar = () => {
    if (chatRoom.room_type === 'group') {
      if (chatRoom.profile_picture) {
        return (
          <Image
            source={{ uri: chatRoom.profile_picture }}
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
    const otherUser = chatRoom.members.find(m => m.id !== currentUser.id);
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
          {otherUser ? `${otherUser.user.first_name?.[0] || '?'}${otherUser.user.last_name?.[0] || ''}` : '?'}
        </Text>
      </View>
    );
  };

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
    if (inputText.trim()) {
      onSendMessage(inputText, 'text', undefined, replyingTo?.id);
      setInputText('');
      setReplyingTo(null);
      onStopTyping();
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    setInputText(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  const handleCameraPress = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert('Camera permission is required!');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      onSendMessage(asset.fileName || 'image', 'image', asset, replyingTo?.id);
      setReplyingTo(null);
    }
  };

  const handleGalleryPress = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert('Gallery permission is required!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const type = asset.type === 'video' ? 'video' : 'image';
      onSendMessage(asset.fileName || type, type, asset, replyingTo?.id);
      setReplyingTo(null);
    }
  };

  const handleFileSelect = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: '*/*',
      copyToCacheDirectory: true,
    });

    if (result.type === 'success') {
      onSendMessage(result.name, 'file', result, replyingTo?.id);
      setReplyingTo(null);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
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
      return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    }
  };

  const shouldShowDateSeparator = (index: number) => {
    if (index === 0) return true;
    const currentDate = new Date(messages[index].created_at).toDateString();
    const previousDate = new Date(messages[index - 1].created_at).toDateString();
    return currentDate !== previousDate;
  };

  const groupedReactions = (reactions: Array<{ user: User; emoji: string }>) => {
    const grouped: { [emoji: string]: User[] } = {};
    reactions.forEach(({ user, emoji }) => {
      if (!grouped[emoji]) grouped[emoji] = [];
      grouped[emoji].push(user);
    });
    return grouped;
  };

  const renderMessage = ({ item: message, index }: { item: Message; index: number }) => {
    const isOwnMessage = message.sender.id === currentUser.id;
    const showDate = shouldShowDateSeparator(index);
    const reactions = groupedReactions(message.reactions || []);

    return (
      <View>
        {showDate && (
          <View style={styles.dateSeparator}>
            <Text style={styles.dateSeparatorText}>
              {formatDate(message.created_at)}
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.messageWrapper,
            isOwnMessage ? styles.messageWrapperOwn : styles.messageWrapperOther,
          ]}
          onPress={() => setSelectedMessage(selectedMessage === message.id ? null : message.id)}
          activeOpacity={0.9}
        >
          {!isOwnMessage && chatRoom.room_type === 'group' && (
            <View style={styles.messageAvatar}>
              {message.sender.profile_picture ? (
                <Image
                  source={{ uri: message.sender.profile_picture }}
                  style={styles.messageAvatarImage}
                />
              ) : (
                <View style={styles.messageAvatarPlaceholder}>
                  <Text style={styles.messageAvatarText}>
                    {message.sender.first_name?.[0] || '?'}
                  </Text>
                </View>
              )}
            </View>
          )}

          <View style={styles.messageContentWrapper}>
            {message.parent_message && (
              <View style={styles.replyContext}>
                <View style={styles.replyBar} />
                <View style={styles.replyInfo}>
                  <Text style={styles.replySender}>
                    {message.parent_message.sender.id === currentUser.id
                      ? 'You'
                      : message.parent_message.sender.first_name}
                  </Text>
                  <Text style={styles.replyPreview} numberOfLines={1}>
                    {message.parent_message.content.substring(0, 50)}
                  </Text>
                </View>
              </View>
            )}

            <View
              style={[
                styles.messageBubble,
                isOwnMessage ? styles.messageBubbleSent : styles.messageBubbleReceived,
              ]}
            >
              {!isOwnMessage && chatRoom.room_type === 'group' && (
                <Text
                  style={[
                    styles.messageSenderName,
                    { color: `hsl(${message.sender.id * 137.5 % 360}, 70%, 50%)` },
                  ]}
                >
                  {message.sender.first_name}
                </Text>
              )}

              {message.message_type === 'image' && message.file_url && (
                <View style={styles.messageImage}>
                  <Image
                    source={{ uri: message.file_url }}
                    style={styles.messageImageContent}
                    resizeMode="cover"
                  />
                </View>
              )}

              {message.message_type === 'file' && (
                <View style={styles.messageFile}>
                  <Text style={styles.fileIcon}>📄</Text>
                  <View style={styles.fileInfo}>
                    <Text style={styles.fileName} numberOfLines={1}>
                      {message.file_name}
                    </Text>
                    <Text style={styles.fileSize}>Document</Text>
                  </View>
                </View>
              )}

              {message.message_type === 'text' && (
                <Text style={styles.messageText}>{message.content}</Text>
              )}

              <View style={styles.messageMeta}>
                <Text style={styles.messageTime}>{formatTime(message.created_at)}</Text>
                {isOwnMessage && (
                  <Ionicons
                    name="checkmark-done"
                    size={16}
                    color="#8696a0"
                    style={styles.messageStatus}
                  />
                )}
                {message.is_edited && (
                  <Text style={styles.editedLabel}>edited</Text>
                )}
              </View>
            </View>

            {Object.keys(reactions).length > 0 && (
              <View style={styles.messageReactions}>
                {Object.entries(reactions).map(([emoji, users]) => (
                  <TouchableOpacity
                    key={emoji}
                    style={styles.reactionBubble}
                    onPress={() => onReact(message.id, emoji)}
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
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      {/* Header */}
      <TouchableOpacity
        style={styles.header}
        onPress={onHeaderClick}
        activeOpacity={0.9}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#111b21" />
        </TouchableOpacity>

        <View style={styles.headerInfo}>
          {getChatAvatar()}
          <View style={styles.headerText}>
            <Text style={styles.headerName} numberOfLines={1}>
              {getChatName()}
            </Text>
            <Text style={styles.headerStatus} numberOfLines={1}>
              {typingUsers.length > 0 ? (
                <Text style={styles.typingIndicator}>
                  {typingUsers.length === 1
                    ? `${typingUsers[0].first_name} is typing...`
                    : `${typingUsers.length} people are typing...`}
                </Text>
              ) : chatRoom.room_type === 'group' ? (
                `${chatRoom.members.length} members`
              ) : (
                'Tap for info'
              )}
            </Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerIconBtn} activeOpacity={0.7}>
            <Ionicons name="ellipsis-vertical" size={24} color="#8696a0" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>

      {/* Messages List */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id.toString()}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContent}
        inverted={false}
        onEndReached={onLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          isLoading ? (
            <View style={styles.loadingIndicator}>
              <ActivityIndicator size="small" color="#00a884" />
            </View>
          ) : null
        }
      />

      {/* Reply Bar */}
      {replyingTo && (
        <View style={styles.replyBarContainer}>
          <View style={styles.replyBarContent}>
            <View style={styles.replyBarLeft}>
              <View style={styles.replyBarLine} />
              <View>
                <Text style={styles.replyToText}>
                  Replying to{' '}
                  {replyingTo.sender.id === currentUser.id
                    ? 'yourself'
                    : replyingTo.sender.first_name}
                </Text>
                <Text style={styles.replyPreview} numberOfLines={1}>
                  {replyingTo.content.substring(0, 50)}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.replyClose}
              onPress={() => setReplyingTo(null)}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={20} color="#8696a0" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Input Container */}
      <View style={styles.inputContainer}>
        <View style={styles.inputRow}>
          <TouchableOpacity
            style={styles.inputIconBtn}
            onPress={() => setShowEmojiPicker(!showEmojiPicker)}
            activeOpacity={0.7}
          >
            <Ionicons name="happy-outline" size={24} color="#8696a0" />
          </TouchableOpacity>

          <TextInput
            style={styles.messageInput}
            placeholder="Message"
            placeholderTextColor="#8696a0"
            value={inputText}
            onChangeText={handleInputChange}
            multiline
            maxLength={1000}
          />

          <TouchableOpacity
            style={styles.inputIconBtn}
            onPress={() => setShowAttachmentMenu(!showAttachmentMenu)}
            activeOpacity={0.7}
          >
            <Ionicons name="attach" size={24} color="#8696a0" />
          </TouchableOpacity>

          {inputText.trim() ? (
            <TouchableOpacity
              style={styles.sendButton}
              onPress={handleSend}
              activeOpacity={0.8}
            >
              <Ionicons name="send" size={20} color="#ffffff" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.inputIconBtn} activeOpacity={0.7}>
              <Ionicons name="mic" size={24} color="#8696a0" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Emoji Picker */}
      <EmojiPicker
        visible={showEmojiPicker}
        onSelect={handleEmojiSelect}
        onClose={() => setShowEmojiPicker(false)}
      />

      {/* Attachment Menu */}
      <AttachmentMenu
        visible={showAttachmentMenu}
        onFileSelect={handleFileSelect}
        onCameraSelect={handleCameraPress}
        onGallerySelect={handleGalleryPress}
        onAudioSelect={() => {}}
        onClose={() => setShowAttachmentMenu(false)}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#efeae2',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f2f5',
    paddingTop: 40,
    paddingBottom: 10,
    paddingHorizontal: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e9edef',
  },
  backButton: {
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
    backgroundColor: '#e9edef',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8696a0',
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  headerName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111b21',
  },
  headerStatus: {
    fontSize: 13,
    color: '#667781',
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
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
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
    backgroundColor: '#e9edef',
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageAvatarText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8696a0',
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
  },
  replyBar: {
    width: 4,
    backgroundColor: '#00a884',
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
  messageSenderName: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  messageImage: {
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 4,
  },
  messageImageContent: {
    width: 250,
    height: 250,
  },
  messageFile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
    borderRadius: 8,
    marginBottom: 4,
  },
  fileIcon: {
    fontSize: 32,
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
    fontSize: 13,
    color: '#667781',
  },
  messageText: {
    fontSize: 14.2,
    lineHeight: 19,
    color: '#111b21',
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
  replyBarContainer: {
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
});