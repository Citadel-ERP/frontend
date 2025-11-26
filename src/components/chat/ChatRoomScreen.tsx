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

interface Message {
  id: number;
  content: string;
  message_type: 'text' | 'image' | 'file' | 'contact';
  sender: {
    id: number;
    first_name: string;
    last_name: string;
  };
  created_at: string;
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
    // Replace with your actual WebSocket URL
    const ws = new WebSocket(`ws://${BACKEND_URL.replace('http://', '').replace('https://', '')}/ws/chat/`);
    
    ws.onopen = () => {
      console.log('WebSocket connected');
      ws.send(JSON.stringify({
        action: 'join_room',
        room_id: chatRoom.id,
      }));
    };
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      handleWebSocketMessage(data);
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    ws.onclose = () => {
      console.log('WebSocket disconnected');
    };
    
    setWebsocket(ws);
  };

  const handleWebSocketMessage = (data: any) => {
    switch (data.type) {
      case 'message':
        setMessages(prev => [data.message, ...prev]);
        break;
      case 'typing':
        setIsTyping(true);
        setTypingUser(data.user_name);
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
        setMessages(prev => prev.map(msg => 
          msg.id === data.message.id ? data.message : msg
        ));
        break;
      case 'message_deleted':
        setMessages(prev => prev.filter(msg => msg.id !== data.message_id));
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
        if (pageNum === 1) {
          setMessages(data.messages || []);
        } else {
          setMessages(prev => [...prev, ...(data.messages || [])]);
        }
      } else {
        Alert.alert('Error', data.message || 'Failed to load messages');
      }
    } catch (error) {
      console.error('Error loading messages:', error);
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

      if (response.ok) {
        // Update the temp message with the real one from server
        setMessages(prev => prev.map(msg => 
          msg.id === tempMessage.id ? data.data : msg
        ));

        // Also send via WebSocket if connected
        if (websocket && websocket.readyState === WebSocket.OPEN) {
          websocket.send(JSON.stringify({
            action: 'send_message',
            room_id: chatRoom.id,
            content: messageContent,
            message_type: 'text',
          }));
        }
      } else {
        // Remove temp message on error
        setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id));
        Alert.alert('Error', data.message || 'Failed to send message');
      }
    } catch (error) {
      // Remove temp message on error
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

      if (!result.canceled) {
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

      if (!result.canceled) {
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
        // Send message with uploaded file URL
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

        if (response.ok) {
          setMessages(prev => [data.data, ...prev]);

          // Also send via WebSocket if connected
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
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isMyMessage = item.sender.id === currentUserId;
    
    return (
      <View style={[
        styles.messageContainer,
        isMyMessage ? styles.myMessage : styles.theirMessage
      ]}>
        <View style={[
          styles.messageBubble,
          isMyMessage ? { backgroundColor: colors.primary } : { backgroundColor: colors.white }
        ]}>
          {item.message_type === 'image' && (
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
          {(item.message_type === 'text' || !item.message_type) && (
            <Text style={[
              styles.messageText,
              isMyMessage ? { color: colors.white } : { color: colors.text }
            ]}>
              {item.content}
            </Text>
          )}
          <Text style={[
            styles.messageTime,
            isMyMessage ? { color: 'rgba(255,255,255,0.7)' } : { color: colors.textLight }
          ]}>
            {formatMessageTime(item.created_at)}
          </Text>
        </View>
      </View>
    );
  };

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
              onContentSizeChange={() => flatListRef.current?.scrollToOffset({ offset: 0, animated: true })}
              onEndReached={() => {
                if (!loading) {
                  setPage(prev => prev + 1);
                  loadMessages(page + 1);
                }
              }}
              onEndReachedThreshold={0.5}
            />
            
            {/* Typing Indicator */}
            {isTyping && (
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
  messageBubble: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  messageText: {
    fontSize: fontSize.md,
    lineHeight: 20,
  },
  messageTime: {
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
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