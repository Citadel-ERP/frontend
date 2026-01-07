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
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';

// WhatsApp Colors
const whatsappColors = {
  dark: {
    background: '#0C1317',
    card: '#202C33',
    text: '#E9EDEF',
    textSecondary: '#8696A0',
    textLight: '#667781',
    border: '#2A3942',
    primary: '#008069', // WhatsApp green
    accent: '#00A884',
    header: '#202C33',
    icon: '#AEBAC1',
    danger: '#F15C6D',
    warning: '#F59E0B',
    unread: '#53BDEB',
    myMessageBg: '#005C4B', // Dark green for my messages
    theirMessageBg: '#202C33', // Dark grey for others' messages
    inputBg: '#2A3942', // Dark input background
  },
  light: {
    background: '#FFFFFF',
    card: '#F0F2F5',
    text: '#111B21',
    textSecondary: '#667781',
    textLight: '#8696A0',
    border: '#E1E8ED',
    primary: '#008069', // WhatsApp green
    accent: '#00A884',
    header: '#008069', // WhatsApp green header
    icon: '#8696A0',
    danger: '#F15C6D',
    warning: '#F59E0B',
    unread: '#008069',
    myMessageBg: '#D9FDD3', // Light green for my messages
    theirMessageBg: '#FFFFFF', // White for others' messages
    inputBg: '#F0F2F5', // Light input background
  }
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
  xl: 20,
  full: 999,
};

const fontSize = {
  xs: 12,
  sm: 13,
  md: 14,
  lg: 16,
  xl: 18,
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
  isDark?: boolean;
}

const ChatRoomScreen: React.FC<ChatRoomScreenProps> = ({ 
  chatRoom, 
  onBack, 
  currentUserId = 1,
  isDark = false
}) => {
  const insets = useSafeAreaInsets();
  const currentColors = isDark ? whatsappColors.dark : whatsappColors.light;
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUser, setTypingUser] = useState('');
  const [showAttachments, setShowAttachments] = useState(false);
  const [loading, setLoading] = useState(false);
  const [websocket, setWebsocket] = useState<WebSocket | null>(null);
  const [token, setToken] = useState<string>('');
  const [page, setPage] = useState(1);
  const [isRecording, setIsRecording] = useState(false);
  
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
      const wsBaseUrl = BACKEND_URL_WEBSOCKET.replace('http://', '').replace('https://', '');
      const wsUrl = `ws://${wsBaseUrl}/ws/chat/`;
      
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
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
          <Text style={[styles.senderName, { color: currentColors.textSecondary }]}>{senderName}</Text>
        )}
        
        <View style={[
          styles.messageBubble,
          isMyMessage ? 
            { backgroundColor: currentColors.myMessageBg } : 
            { backgroundColor: currentColors.theirMessageBg }
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
              <Ionicons 
                name="document-attach" 
                size={20} 
                color={isMyMessage ? '#FFFFFF' : currentColors.primary} 
              />
              <Text style={[
                styles.fileText, 
                { 
                  color: isMyMessage ? '#FFFFFF' : currentColors.primary,
                  marginLeft: spacing.sm 
                }
              ]}>
                Document
              </Text>
            </TouchableOpacity>
          )}
          
          {(item.message_type === 'text' || !item.message_type) && item.content && (
            <Text style={[
              styles.messageText,
              { color: isMyMessage ? '#FFFFFF' : currentColors.text }
            ]}>
              {item.content}
            </Text>
          )}
          
          <View style={styles.messageFooter}>
            <Text style={[
              styles.messageTime,
              { 
                color: isMyMessage ? 'rgba(255,255,255,0.6)' : currentColors.textSecondary,
                fontSize: fontSize.xs 
              }
            ]}>
              {messageTime}
            </Text>
            {item.is_edited && (
              <Text style={[
                styles.editedLabel,
                { 
                  color: isMyMessage ? 'rgba(255,255,255,0.6)' : currentColors.textSecondary,
                  fontSize: fontSize.xs 
                }
              ]}>
                • edited
              </Text>
            )}
          </View>
        </View>
      </View>
    );
  };

  const renderHeader = () => (
    <View style={[
      styles.header,
      { 
        backgroundColor: currentColors.header,
        paddingTop: Platform.OS === 'ios' ? insets.top : 10,
      }
    ]}>
      <View style={styles.headerContent}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={onBack}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {chatRoom.name || getOtherUserName(chatRoom)}
          </Text>
          {isTyping ? (
            <Text style={styles.headerSubtitle}>
              {typingUser ? `${typingUser} is typing...` : 'typing...'}
            </Text>
          ) : (
            <Text style={styles.headerSubtitle}>
              {messages.length > 0 ? 'online' : ''}
            </Text>
          )}
        </View>
        
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerActionButton}>
            <Ionicons name="videocam" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerActionButton}>
            <Ionicons name="call" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerActionButton}>
            <Ionicons name="ellipsis-vertical" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: currentColors.background }]}>
      <StatusBar 
        barStyle="light-content" 
        backgroundColor={currentColors.header} 
      />
      
      {/* Header */}
      {renderHeader()}
      
      {/* Messages */}
      <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
        {loading && messages.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={currentColors.primary} />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={item => item.id.toString()}
            inverted
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.messagesList}
            style={styles.messagesContainer}
            onEndReached={() => {
              if (!loading) {
                setPage(prev => prev + 1);
                loadMessages(page + 1);
              }
            }}
            onEndReachedThreshold={0.5}
            ListFooterComponent={() => (
              <View style={styles.listFooter}>
                {isTyping && (
                  <View style={[styles.typingBubble, { backgroundColor: currentColors.theirMessageBg }]}>
                    <View style={styles.typingDots}>
                      <View style={[styles.typingDot, { backgroundColor: currentColors.textSecondary }]} />
                      <View style={[styles.typingDot, { backgroundColor: currentColors.textSecondary }]} />
                      <View style={[styles.typingDot, { backgroundColor: currentColors.textSecondary }]} />
                    </View>
                  </View>
                )}
              </View>
            )}
          />
        )}
      </SafeAreaView>

      {/* Message Input */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        style={[
          styles.inputContainer,
          { backgroundColor: currentColors.background }
        ]}
      >
        <View style={[
          styles.inputWrapper,
          { backgroundColor: currentColors.inputBg }
        ]}>
          <TouchableOpacity
            style={styles.inputIconButton}
            onPress={() => setShowAttachments(true)}
          >
            <Ionicons 
              name="add" 
              size={24} 
              color={currentColors.textSecondary} 
            />
          </TouchableOpacity>
          
          <TextInput
            style={[
              styles.input,
              { 
                color: currentColors.text,
                backgroundColor: currentColors.inputBg 
              }
            ]}
            placeholder="Message"
            placeholderTextColor={currentColors.textSecondary}
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
          
          {newMessage.trim() ? (
            <TouchableOpacity
              style={styles.sendButton}
              onPress={sendMessage}
            >
              <Ionicons 
                name="send" 
                size={20} 
                color={currentColors.primary} 
              />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.recordButton}
              onPress={() => setIsRecording(!isRecording)}
              onLongPress={() => {
                // Start recording
                setIsRecording(true);
              }}
              onPressOut={() => {
                // Stop recording
                setIsRecording(false);
              }}
            >
              <Ionicons 
                name="mic" 
                size={20} 
                color={currentColors.textSecondary} 
              />
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>

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
          <View style={[
            styles.attachmentModal,
            { backgroundColor: currentColors.background }
          ]}>
            <View style={[styles.attachmentHandle, { backgroundColor: currentColors.textSecondary }]} />
            
            <TouchableOpacity 
              style={styles.attachmentOption}
              onPress={() => {
                setShowAttachments(false);
                setTimeout(() => pickImage(), 300);
              }}
            >
              <View style={[styles.attachmentIconContainer, { backgroundColor: currentColors.card }]}>
                <Ionicons name="image" size={24} color={currentColors.primary} />
              </View>
              <Text style={[styles.attachmentText, { color: currentColors.text }]}>
                Photos & Videos
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.attachmentOption}
              onPress={() => {
                setShowAttachments(false);
                setTimeout(() => pickDocument(), 300);
              }}
            >
              <View style={[styles.attachmentIconContainer, { backgroundColor: currentColors.card }]}>
                <Ionicons name="document" size={24} color={currentColors.primary} />
              </View>
              <Text style={[styles.attachmentText, { color: currentColors.text }]}>
                Document
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.attachmentOption}
              onPress={() => {
                setShowAttachments(false);
                Alert.alert('Coming Soon', 'Contact sharing will be available soon!');
              }}
            >
              <View style={[styles.attachmentIconContainer, { backgroundColor: currentColors.card }]}>
                <Ionicons name="person" size={24} color={currentColors.primary} />
              </View>
              <Text style={[styles.attachmentText, { color: currentColors.text }]}>
                Contact
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.attachmentOption}
              onPress={() => {
                setShowAttachments(false);
                Alert.alert('Coming Soon', 'Camera will be available soon!');
              }}
            >
              <View style={[styles.attachmentIconContainer, { backgroundColor: currentColors.card }]}>
                <Ionicons name="camera" size={24} color={currentColors.primary} />
              </View>
              <Text style={[styles.attachmentText, { color: currentColors.text }]}>
                Camera
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
    zIndex: 1000,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.full,
  },
  backText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    marginLeft: spacing.xs,
  },
  headerInfo: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: fontSize.xs,
    color: 'rgba(255,255,255,0.8)',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  headerActionButton: {
    padding: spacing.sm,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesList: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    marginBottom: spacing.xs,
    marginLeft: spacing.sm,
  },
  messageBubble: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm - 2,
    borderRadius: borderRadius.xl,
    borderTopLeftRadius: borderRadius.md,
    borderBottomRightRadius: borderRadius.md,
  },
  messageText: {
    fontSize: fontSize.md,
    lineHeight: 20,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: spacing.xs,
  },
  messageTime: {
    opacity: 0.8,
  },
  editedLabel: {
    marginLeft: spacing.xs,
  },
  messageImage: {
    width: 240,
    height: 160,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  fileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  fileText: {
    fontSize: fontSize.md,
    fontWeight: '500',
  },
  listFooter: {
    marginTop: spacing.sm,
  },
  typingBubble: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm - 2,
    borderRadius: borderRadius.xl,
    borderTopLeftRadius: borderRadius.md,
    borderBottomRightRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  typingDots: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginHorizontal: 1,
    opacity: 0.6,
  },
  inputContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.sm,
  },
  inputIconButton: {
    padding: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: fontSize.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.xl,
  },
  sendButton: {
    padding: spacing.sm,
  },
  recordButton: {
    padding: spacing.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  attachmentModal: {
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  attachmentHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: spacing.lg,
    opacity: 0.3,
  },
  attachmentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
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
    fontSize: fontSize.lg,
    fontWeight: '400',
  },
});

export default ChatRoomScreen;