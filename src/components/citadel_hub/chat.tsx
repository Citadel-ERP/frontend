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
  Alert,
  Modal,
  ScrollView,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EmojiPicker } from './emojiPicker';
import { AttachmentMenu } from './attachmentMenu';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';


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
  chat_room?: number;
}

interface ChatRoom {
  id: number;
  name?: string;
  room_type: 'direct' | 'group';
  profile_picture?: string;
  members: (User | ChatRoomMember)[];
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
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [isPickingMedia, setIsPickingMedia] = useState(false);
  
  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Helper function to extract user from member object
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

  const getChatName = () => {
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
    
    const currentUserId = currentUser.id || currentUser.employee_id;
    const otherMember = chatRoom.members.find(m => {
      const user = getUserFromMember(m);
      return user && (user.id || user.employee_id) !== currentUserId;
    });
    
    const otherUser = otherMember ? getUserFromMember(otherMember) : null;
    
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
          {otherUser 
            ? `${otherUser.first_name?.[0] || '?'}${otherUser.last_name?.[0] || ''}` 
            : '?'}
        </Text>
      </View>
    );
  };

  useEffect(() => {
    if (messages.length > 0 && flatListRef.current) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  }, [messages]);

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
    if (isPickingMedia) return;
    
    try {
      setIsPickingMedia(true);
      setShowAttachmentMenu(false);
      
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert('Permission Required', 'Camera permission is required to take photos!');
        setIsPickingMedia(false);
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: true,
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        const messageType = asset.type === 'video' ? 'video' : 'image';
        const fileName = asset.fileName || `${messageType}_${Date.now()}`;
        
        onSendMessage(fileName, messageType, asset, replyingTo?.id);
        setReplyingTo(null);
      }
      setIsPickingMedia(false);
    } catch (error) {
      console.error('Error taking photo:', error);
      setIsPickingMedia(false);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  const handleGalleryPress = async () => {
    if (isPickingMedia) return;
    
    try {
      setIsPickingMedia(true);
      setShowAttachmentMenu(false);
      
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert('Permission Required', 'Gallery permission is required to select photos!');
        setIsPickingMedia(false);
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: true,
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        const messageType = asset.type === 'video' ? 'video' : 'image';
        const fileName = asset.fileName || `${messageType}_${Date.now()}`;
        
        onSendMessage(fileName, messageType, asset, replyingTo?.id);
        setReplyingTo(null);
      }
      setIsPickingMedia(false);
    } catch (error) {
      console.error('Error selecting from gallery:', error);
      setIsPickingMedia(false);
      Alert.alert('Error', 'Failed to select media. Please try again.');
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
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        const fileName = asset.name || `document_${Date.now()}`;
        
        onSendMessage(fileName, 'file', asset, replyingTo?.id);
        setReplyingTo(null);
      }
      setIsPickingMedia(false);
    } catch (error) {
      console.error('Error selecting file:', error);
      setIsPickingMedia(false);
      Alert.alert('Error', 'Failed to select file. Please try again.');
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

  const handleClearChat = () => {
    Alert.alert(
      'Clear Chat',
      'Are you sure you want to clear all messages? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          onPress: () => {},
          style: 'cancel',
        },
        {
          text: 'Clear',
          onPress: () => {
            Alert.alert('Success', 'Chat cleared successfully');
            setShowOptionsModal(false);
          },
          style: 'destructive',
        },
      ]
    );
  };

  const handleMuteChat = () => {
    Alert.alert('Mute Chat', 'You will not receive notifications from this chat');
    setShowOptionsModal(false);
  };

  const handleExportChat = () => {
    Alert.alert('Export Chat', 'Chat exported as PDF');
    setShowOptionsModal(false);
  };

  const handleDownloadFile = (fileUrl: string, fileName: string) => {
    if (fileUrl) {
      Linking.openURL(fileUrl).catch(() => {
        Alert.alert('Error', 'Unable to open file. Please try again.');
      });
    }
  };

  const getFileExtension = (fileName: string) => {
    const parts = fileName.split('.');
    return parts.length > 1 ? parts[parts.length - 1].toUpperCase() : 'FILE';
  };

  const renderMessage = ({ item: message, index }: { item: Message; index: number }) => {
    const isOwnMessage = (message.sender.id || message.sender.employee_id) === (currentUser.id || currentUser.employee_id);
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
                    {(message.parent_message.sender.id || message.parent_message.sender.employee_id) === (currentUser.id || currentUser.employee_id)
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
                    { color: `hsl(${(message.sender.id || 0) * 137.5 % 360}, 70%, 50%)` },
                  ]}
                >
                  {message.sender.first_name}
                </Text>
              )}

              {message.message_type === 'image' && message.file_url && (
                <TouchableOpacity
                  style={styles.messageImage}
                  onPress={() => setSelectedImageUrl(message.file_url || null)}
                  activeOpacity={0.8}
                >
                  <Image
                    source={{ uri: message.file_url }}
                    style={styles.messageImageContent}
                    resizeMode="cover"
                  />
                  <View style={styles.imageOverlay}>
                    <Ionicons name="expand" size={24} color="#ffffff" />
                  </View>
                </TouchableOpacity>
              )}

              {message.message_type === 'video' && message.file_url && (
                <TouchableOpacity
                  style={styles.messageVideo}
                  onPress={() => handleDownloadFile(message.file_url || '', message.file_name || 'video')}
                  activeOpacity={0.8}
                >
                  <View style={styles.videoPlayButton}>
                    <Ionicons name="play" size={32} color="#ffffff" />
                  </View>
                  <Image
                    source={{ uri: message.file_url }}
                    style={styles.messageVideoThumbnail}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              )}

              {message.message_type === 'file' && (
                <TouchableOpacity
                  style={styles.messageFile}
                  onPress={() => handleDownloadFile(message.file_url || '', message.file_name || 'file')}
                  activeOpacity={0.7}
                >
                  <View style={styles.fileIconContainer}>
                    <Text style={styles.fileIcon}>📄</Text>
                  </View>
                  <View style={styles.fileInfo}>
                    <Text style={styles.fileName} numberOfLines={1}>
                      {message.file_name || 'Document'}
                    </Text>
                    <Text style={styles.fileExtension}>
                      {getFileExtension(message.file_name || 'file')}
                    </Text>
                  </View>
                  <View style={styles.downloadButton}>
                    <Ionicons name="download" size={16} color="#00a884" />
                  </View>
                </TouchableOpacity>
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
          <Ionicons name="chevron-back" size={28} color="#fff" />
        </TouchableOpacity>

        <View style={styles.headerInfo}>
          {getChatAvatar()}
          <TouchableOpacity 
            style={styles.headerText}
            onPress={onHeaderClick}
            activeOpacity={0.7}
          >
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
                'Online'
              )}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.headerIconBtn} 
            onPress={() => setShowOptionsModal(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="ellipsis-vertical" size={24} color="#ffffff" />
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
                  {(replyingTo.sender.id || replyingTo.sender.employee_id) === (currentUser.id || currentUser.employee_id)
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
            disabled={isPickingMedia}
          >
            <Ionicons name="attach" size={24} color={isPickingMedia ? '#ccc' : '#8696a0'} />
          </TouchableOpacity>

          {inputText.trim() ? (
            <TouchableOpacity
              style={styles.sendButton}
              onPress={handleSend}
              activeOpacity={0.8}
              disabled={isPickingMedia}
            >
              <Ionicons name="send" size={20} color="#ffffff" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.inputIconBtn} activeOpacity={0.7} disabled={isPickingMedia}>
              <Ionicons name="mic" size={24} color={isPickingMedia ? '#ccc' : '#8696a0'} />
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
        visible={showAttachmentMenu && !isPickingMedia}
        onFileSelect={handleFileSelect}
        onCameraSelect={handleCameraPress}
        onGallerySelect={handleGalleryPress}
        onClose={() => setShowAttachmentMenu(false)}
      />

      {/* Full Screen Image Viewer Modal */}
      <Modal
        visible={selectedImageUrl !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedImageUrl(null)}
      >
        <View style={styles.imageViewerContainer}>
          <TouchableOpacity
            style={styles.imageViewerClose}
            onPress={() => setSelectedImageUrl(null)}
          >
            <Ionicons name="close" size={32} color="#ffffff" />
          </TouchableOpacity>
          
          {selectedImageUrl && (
            <Image
              source={{ uri: selectedImageUrl }}
              style={styles.fullScreenImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>

      {/* Options Modal */}
      <Modal
        visible={showOptionsModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowOptionsModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowOptionsModal(false)}
        >
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.modalMenuItem}
              onPress={() => setShowOptionsModal(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.modalMenuText}>Search</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalMenuItem}
              onPress={handleClearChat}
              activeOpacity={0.7}
            >
              <Text style={styles.modalMenuText}>Clear Chat</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalMenuItem}
              onPress={handleMuteChat}
              activeOpacity={0.7}
            >
              <Text style={styles.modalMenuText}>Mute</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalMenuItem}
              onPress={handleExportChat}
              activeOpacity={0.7}
            >
              <Text style={styles.modalMenuText}>Export</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
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
    backgroundColor: '#008069',
    paddingTop: 90,
    paddingBottom: 10,
    paddingHorizontal: 16,
    gap: 12,
    borderBottomWidth: 0,
    marginTop: -80,
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
    color: '#ffffff',
  },
  headerStatus: {
    fontSize: 13,
    color: '#ffffff',
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
    position: 'relative',
  },
  messageImageContent: {
    width: 250,
    height: 250,
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageVideo: {
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 4,
    position: 'relative',
    width: 250,
    height: 250,
  },
  messageVideoThumbnail: {
    width: '100%',
    height: '100%',
  },
  videoPlayButton: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  messageFile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: '#f0f2f5',
    borderRadius: 8,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#e9edef',
  },
  fileIconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
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
  fileExtension: {
    fontSize: 12,
    color: '#667781',
    fontWeight: '500',
  },
  downloadButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
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
  imageViewerContainer: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 50,
  },
  imageViewerClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  fullScreenImage: {
    width: '100%',
    height: '100%',
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
  modalMenuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalMenuText: {
    fontSize: 15,
    color: '#111b21',
    fontWeight: '400',
  },
});