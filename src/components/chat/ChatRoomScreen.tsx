// screens/ChatRoomScreen.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Modal,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BACKEND_URL, BACKEND_URL_WEBSOCKET } from '../../config/config';

const colors = {
  primary: '#2D3748',
  background: '#FFFFFF',
  backgroundSecondary: '#F7FAFC',
  text: '#2D3748',
  textSecondary: '#718096',
  textLight: '#A0AEC0',
  white: '#FFFFFF',
  border: '#E2E8F0',
  info: '#3182CE',
};

const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
};

const borderRadius = {
  sm: 4,
  lg: 12,
  xl: 16,
};

const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
};

const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
};

interface ChatRoom {
  id: number;
  name?: string;
  room_type: 'direct' | 'group';
  members?: Array<{
    id: number;
    first_name: string;
    last_name: string;
  }>;
}

interface User {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
}

interface Message {
  id: number;
  content: string;
  message_type: 'text' | 'image' | 'file' | 'contact';
  sender: User;
  created_at: string;
  is_edited?: boolean;
  is_deleted?: boolean;
}

interface WebSocketMessage {
  type: string;
  message?: Message;
  user_id?: number;
  user_name?: string;
  room_id?: number;
  message_id?: string;
  emoji?: string;
}

interface ChatRoomScreenProps {
  chatRoom: ChatRoom;
  onBack: () => void;
  currentUserId?: number;
}

const ChatRoomScreen: React.FC<ChatRoomScreenProps> = ({ 
  chatRoom, 
  onBack, 
  currentUserId = 1 
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUser, setTypingUser] = useState('');
  const [showAttachments, setShowAttachments] = useState(false);
  const [loading, setLoading] = useState(false);
  const [websocket, setWebsocket] = useState<WebSocket | null>(null);
  const [token, setToken] = useState<string>('');
  const [page, setPage] = useState(1);
  
  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
      loadMessages();
      connectWebSocket();
    }
    
    return () => {
      if (websocket) {
        websocket.close();
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [chatRoom.id, token]);

  const connectWebSocket = () => {
    try {
      // Remove protocol and construct proper WebSocket URL
      const wsBaseUrl = BACKEND_URL_WEBSOCKET.replace('http://', '').replace('https://', '');
      const wsUrl = `ws://${wsBaseUrl}/ws/chat/`;
      
      console.log('Connecting to WebSocket:', wsUrl);
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log('WebSocket connected');
        ws.send(JSON.stringify({
          action: 'join_room',
          room_id: chatRoom.id,
        }));
      };
      
      ws.onmessage = (event) => {
        try {
          const data: WebSocketMessage = JSON.parse(event.data);
          handleWebSocketMessage(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
      
      ws.onclose = () => {
        console.log('WebSocket disconnected');
      };
      
      setWebsocket(ws);
    } catch (error) {
      console.error('Error connecting to WebSocket:', error);
    }
  };

  const handleWebSocketMessage = (data: WebSocketMessage) => {
    switch (data.type) {
      case 'message':
        if (data.message) {
          setMessages(prev => [data.message!, ...prev]);
        }
        break;
      case 'typing':
        setIsTyping(true);
        setTypingUser(data.user_name || '');
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
        typingTimeoutRef.current = setTimeout(() => {
          setIsTyping(false);
          setTypingUser('');
        }, 3000);
        break;
      case 'stop_typing':
        setIsTyping(false);
        setTypingUser('');
        break;
      case 'message_edited':
        if (data.message) {
          setMessages(prev => prev.map(msg => 
            msg.id === data.message!.id ? data.message! : msg
          ));
        }
        break;
      case 'message_deleted':
        if (data.message_id) {
          setMessages(prev => prev.filter(msg => msg.id.toString() !== data.message_id));
        }
        break;
    }
  };

  const loadMessages = async (pageNum: number = 1) => {
    try {
      setLoading(true);
      const response = await fetch(`${BACKEND_URL}/citadel_hub/getMessages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          chat_room_id: chatRoom.id,
          page: pageNum,
          page_size: 50,
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // Extract only the necessary message fields
        const cleanMessages = (data.messages || []).map((msg: any) => ({
          id: msg.id,
          content: msg.content || '',
          message_type: msg.message_type || 'text',
          sender: {
            id: msg.sender?.id || 0,
            first_name: msg.sender?.first_name || '',
            last_name: msg.sender?.last_name || '',
            email: msg.sender?.email || '',
          },
          created_at: msg.created_at || new Date().toISOString(),
          is_edited: msg.is_edited || false,
          is_deleted: msg.is_deleted || false,
        }));

        if (pageNum === 1) {
          setMessages(cleanMessages);
        } else {
          setMessages(prev => [...prev, ...cleanMessages]);
        }
      } else {
        Alert.alert('Error', data.message || 'Failed to load messages');
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      Alert.alert('Error', 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    const tempMessage: Message = {
      id: Date.now(),
      content: newMessage,
      message_type: 'text',
      sender: {
        id: currentUserId,
        first_name: 'You',
        last_name: '',
        email: '',
      },
      created_at: new Date().toISOString(),
    };

    setMessages(prev => [tempMessage, ...prev]);
    const messageContent = newMessage;
    setNewMessage('');

    try {
      const response = await fetch(`${BACKEND_URL}/citadel_hub/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          chat_room_id: chatRoom.id,
          content: messageContent,
          message_type: 'text',
        }),
      });

      const data = await response.json();

      if (response.ok && data.data) {
        // Clean the message data
        const cleanMessage: Message = {
          id: data.data.id,
          content: data.data.content || '',
          message_type: data.data.message_type || 'text',
          sender: {
            id: data.data.sender?.id || currentUserId,
            first_name: data.data.sender?.first_name || 'You',
            last_name: data.data.sender?.last_name || '',
            email: data.data.sender?.email || '',
          },
          created_at: data.data.created_at || new Date().toISOString(),
          is_edited: data.data.is_edited || false,
          is_deleted: data.data.is_deleted || false,
        };

        setMessages(prev => prev.map(msg => 
          msg.id === tempMessage.id ? cleanMessage : msg
        ));

        // Send via WebSocket if connected
        if (websocket && websocket.readyState === WebSocket.OPEN) {
          websocket.send(JSON.stringify({
            action: 'send_message',
            room_id: chatRoom.id,
            content: messageContent,
            message_type: 'text',
          }));
        }
      } else {
        setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id));
        Alert.alert('Error', data.message || 'Failed to send message');
      }
    } catch (error) {
      setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id));
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message');
    }

    stopTyping();
  };

  const startTyping = () => {
    if (websocket && websocket.readyState === WebSocket.OPEN) {
      websocket.send(JSON.stringify({
        action: 'typing',
        room_id: chatRoom.id,
      }));
    }
  };

  const stopTyping = () => {
    if (websocket && websocket.readyState === WebSocket.OPEN) {
      websocket.send(JSON.stringify({
        action: 'stop_typing',
        room_id: chatRoom.id,
      }));
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        sendFileMessage(result.assets[0].uri, 'image');
      }
    } catch (error) {
      console.error('Error picking image:', error);
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        sendFileMessage(result.assets[0].uri, 'file');
      }
    } catch (error) {
      console.error('Error picking document:', error);
    }
  };

  const sendFileMessage = async (fileUri: string, messageType: 'image' | 'file') => {
    try {
      const formData = new FormData();
      formData.append('file', {
        uri: fileUri,
        type: messageType === 'image' ? 'image/jpeg' : 'application/octet-stream',
        name: messageType === 'image' ? 'image.jpg' : 'file',
      } as any);

      const uploadResponse = await fetch(`${BACKEND_URL}/citadel_hub/upload/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const uploadData = await uploadResponse.json();
      
      if (uploadResponse.ok) {
        const response = await fetch(`${BACKEND_URL}/citadel_hub/sendMessage`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            token,
            chat_room_id: chatRoom.id,
            content: uploadData.file_url,
            message_type: messageType,
          }),
        });

        const data = await response.json();

        if (response.ok && data.data) {
          const cleanMessage: Message = {
            id: data.data.id,
            content: data.data.content || '',
            message_type: data.data.message_type || messageType,
            sender: {
              id: data.data.sender?.id || currentUserId,
              first_name: data.data.sender?.first_name || 'You',
              last_name: data.data.sender?.last_name || '',
              email: data.data.sender?.email || '',
            },
            created_at: data.data.created_at || new Date().toISOString(),
            is_edited: data.data.is_edited || false,
            is_deleted: data.data.is_deleted || false,
          };

          setMessages(prev => [cleanMessage, ...prev]);

          if (websocket && websocket.readyState === WebSocket.OPEN) {
            websocket.send(JSON.stringify({
              action: 'send_message',
              room_id: chatRoom.id,
              content: uploadData.file_url,
              message_type: messageType,
            }));
          }
        } else {
          Alert.alert('Error', data.message || 'Failed to send file');
        }
      } else {
        Alert.alert('Error', 'Failed to upload file');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      Alert.alert('Error', 'Failed to upload file');
    }
  };

  const getOtherUserName = (chatRoom: ChatRoom): string => {
    if (chatRoom.room_type === 'direct' && chatRoom.members) {
      const otherMember = chatRoom.members.find(member => member.id !== currentUserId);
      return otherMember ? `${otherMember.first_name} ${otherMember.last_name}` : 'Unknown User';
    }
    return chatRoom.name || 'Group Chat';
  };

  const formatMessageTime = (timestamp: string): string => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (error) {
      return '';
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isMyMessage = item.sender && item.sender.id === currentUserId;
    const senderName = item.sender ? `${item.sender.first_name || ''} ${item.sender.last_name || ''}`.trim() || 'Unknown' : 'Unknown';
    const messageTime = formatMessageTime(item.created_at);
    
    return (
      <View style={[
        styles.messageContainer,
        isMyMessage ? styles.myMessage : styles.theirMessage
      ]}>
        {!isMyMessage && chatRoom.room_type === 'group' && (
          <Text style={styles.senderName}>{senderName}</Text>
        )}
        <View style={[
          styles.messageBubble,
          isMyMessage ? { backgroundColor: colors.primary } : { backgroundColor: colors.white }
        ]}>
          {item.message_type === 'image' && item.content && (
            <Image 
              source={{ uri: item.content }} 
              style={styles.messageImage}
              resizeMode="cover"
            />
          )}
          {item.message_type === 'file' && (
            <TouchableOpacity style={styles.fileContainer}>
              <Ionicons name="document-attach" size={24} color={isMyMessage ? colors.white : colors.primary} />
              <Text style={[styles.fileText, { color: isMyMessage ? colors.white : colors.primary }]}>
                Attached File
              </Text>
            </TouchableOpacity>
          )}
          {item.message_type === 'contact' && (
            <View style={styles.contactContainer}>
              <Ionicons name="person" size={20} color={colors.info} />
              <Text style={styles.contactText}>Contact Shared</Text>
            </View>
          )}
          {(item.message_type === 'text' || !item.message_type) && item.content && (
            <Text style={[
              styles.messageText,
              isMyMessage ? { color: colors.white } : { color: colors.text }
            ]}>
              {item.content}
            </Text>
          )}
          <View style={styles.messageFooter}>
            {messageTime ? (
              <Text style={[
                styles.messageTime,
                isMyMessage ? { color: 'rgba(255,255,255,0.7)' } : { color: colors.textLight }
              ]}>
                {messageTime}
              </Text>
            ) : null}
            {item.is_edited && (
              <Text style={[
                styles.editedLabel,
                isMyMessage ? { color: 'rgba(255,255,255,0.7)' } : { color: colors.textLight }
              ]}>
                • edited
              </Text>
            )}
          </View>
        </View>
      </View>
    );
  };
  console.log(chatRoom)
  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={onBack}
        >
          <Ionicons name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle} numberOfLines={1}>
          {chatRoom.name || getOtherUserName(chatRoom)}
        </Text>
        
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerActionButton}>
            <Ionicons name="call" size={20} color={colors.white} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerActionButton}>
            <Ionicons name="videocam" size={20} color={colors.white} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerActionButton}>
            <Ionicons name="information-circle" size={20} color={colors.white} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Messages */}
      <View style={styles.messagesContainer}>
        {loading && messages.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <>
            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={renderMessage}
              keyExtractor={item => item.id.toString()}
              inverted
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.messagesList}
              onEndReached={() => {
                if (!loading) {
                  setPage(prev => prev + 1);
                  loadMessages(page + 1);
                }
              }}
              onEndReachedThreshold={0.5}
            />
            
            {/* Typing Indicator */}
            {isTyping && typingUser && (
              <View style={styles.typingContainer}>
                <Text style={styles.typingText}>
                  {typingUser} is typing...
                </Text>
              </View>
            )}
          </>
        )}
      </View>

      {/* Message Input */}
      <View style={styles.inputContainer}>
        <TouchableOpacity
          style={styles.attachmentButton}
          onPress={() => setShowAttachments(true)}
        >
          <Ionicons name="add" size={24} color={colors.text} />
        </TouchableOpacity>
        
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          placeholderTextColor={colors.textLight}
          value={newMessage}
          onChangeText={(text) => {
            setNewMessage(text);
            if (text.length > 0) {
              startTyping();
            } else {
              stopTyping();
            }
          }}
          multiline
          maxLength={1000}
        />
        
        <TouchableOpacity
          style={[
            styles.sendButton,
            !newMessage.trim() && styles.sendButtonDisabled
          ]}
          onPress={sendMessage}
          disabled={!newMessage.trim()}
        >
          <Ionicons 
            name="send" 
            size={20} 
            color={newMessage.trim() ? colors.white : colors.textLight} 
          />
        </TouchableOpacity>
      </View>

      {/* Attachments Modal */}
      <Modal
        visible={showAttachments}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAttachments(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowAttachments(false)}
        >
          <View style={styles.attachmentModal}>
            <View style={styles.attachmentHandle} />
            
            <TouchableOpacity 
              style={styles.attachmentOption}
              onPress={() => {
                setShowAttachments(false);
                setTimeout(() => pickImage(), 300);
              }}
            >
              <View style={[styles.attachmentIconContainer, { backgroundColor: '#E0F2FE' }]}>
                <Ionicons name="image" size={24} color="#0284C7" />
              </View>
              <Text style={styles.attachmentText}>Photo & Video</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.attachmentOption}
              onPress={() => {
                setShowAttachments(false);
                setTimeout(() => pickDocument(), 300);
              }}
            >
              <View style={[styles.attachmentIconContainer, { backgroundColor: '#DBEAFE' }]}>
                <Ionicons name="document" size={24} color="#2563EB" />
              </View>
              <Text style={styles.attachmentText}>Document</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.attachmentOption}
              onPress={() => {
                setShowAttachments(false);
                Alert.alert('Coming Soon', 'Contact sharing will be available soon!');
              }}
            >
              <View style={[styles.attachmentIconContainer, { backgroundColor: '#DCFCE7' }]}>
                <Ionicons name="person" size={24} color="#16A34A" />
              </View>
              <Text style={styles.attachmentText}>Contact</Text>
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
    fontSize: fontSize.lg, 
    fontWeight: '600', 
    color: colors.white, 
    flex: 1, 
    marginLeft: spacing.md,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerActionButton: {
    padding: spacing.sm,
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesList: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  messageContainer: {
    marginVertical: spacing.xs,
    maxWidth: '80%',
  },
  myMessage: {
    alignSelf: 'flex-end',
  },
  theirMessage: {
    alignSelf: 'flex-start',
  },
  senderName: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    marginLeft: spacing.sm,
  },
  messageBubble: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  messageText: {
    fontSize: fontSize.md,
    lineHeight: 20,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  messageTime: {
    fontSize: fontSize.xs,
  },
  editedLabel: {
    fontSize: fontSize.xs,
    marginLeft: spacing.xs,
    fontStyle: 'italic',
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.xs,
  },
  fileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  fileText: {
    fontSize: fontSize.md,
    fontWeight: '500',
    marginLeft: spacing.sm,
  },
  contactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.info + '20',
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  contactText: {
    color: colors.info,
    fontWeight: '500',
    marginLeft: spacing.sm,
  },
  typingContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  typingText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: spacing.md,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.md,
    color: colors.text,
    backgroundColor: colors.white,
    marginRight: spacing.sm,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: colors.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  sendButtonDisabled: {
    backgroundColor: colors.backgroundSecondary,
  },
  attachmentButton: {
    backgroundColor: colors.backgroundSecondary,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
    ...shadows.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  attachmentModal: {
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
    paddingBottom: spacing.lg,
  },
  attachmentHandle: {
    width: 40,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  attachmentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  attachmentIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  attachmentText: {
    fontSize: fontSize.md,
    color: colors.text,
    fontWeight: '500',
  },
});

export default ChatRoomScreen;