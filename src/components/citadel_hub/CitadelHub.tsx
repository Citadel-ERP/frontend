import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, SafeAreaView, StatusBar, Alert } from 'react-native';
import { Header } from './header';
import { SearchAndFilter } from './searchAndFilter';
import { List } from './list';
import { Chat } from './chat';
import { ChatDetails } from './chatDetails';
import { NewGroup } from './newGroup';
import { NewChat } from './newChat';
import { Edit } from './edit';

// ============= TYPE DEFINITIONS =============
export interface User {
  id?: number;
  employee_id?: string;
  first_name: string;
  last_name: string;
  profile_picture?: string;
  email?: string;
  bio?: string;
  designation?: string;
  full_name?: string;
  is_approved_by_admin?: boolean;
  is_approved_by_hr?: boolean;
  is_archived?: boolean;
  role?: string;
}

export interface ChatRoomMember {
  id?: number;
  user?: User;
  is_muted?: boolean;
  is_pinned?: boolean;
  joined_at?: string;
  last_read_at?: string;
  role?: string;
}

export interface MessageReaction {
  id?: number;
  user: User;
  emoji: string;
}

export interface Message {
  id: number;
  sender: User;
  content: string;
  message_type: 'text' | 'image' | 'file' | 'audio' | 'video';
  created_at: string;
  is_edited: boolean;
  parent_message?: Message;
  reactions?: MessageReaction[];
  file_url?: string;
  file_name?: string;
  chat_room?: number;
}

export interface ChatRoom {
  id: number;
  name?: string;
  room_type: 'direct' | 'group';
  profile_picture?: string;
  members: (User | ChatRoomMember)[];
  last_message_at?: string;
  unread_count?: number;
  is_pinned?: boolean;
  is_muted?: boolean;
  description?: string;
  created_at: string;
  updated_at?: string;
  admin?: User;
  is_blocked?: boolean;
  media_count?: number;
}

export interface MessageRead {
  user: User;
  read_at: string;
}

export interface Notification {
  id: number;
  type: string;
  message: string;
  created_at: string;
  is_read: boolean;
}

export type ViewMode = 'list' | 'chat' | 'chatDetails' | 'newGroup' | 'newChat' | 'edit';

interface CitadelHubProps {
  apiBaseUrl: string;
  wsBaseUrl: string;
  token: string | null;
  onBack?: () => void;
  currentUser: User;
}

// ============= MAIN COMPONENT =============
export const CitadelHub: React.FC<CitadelHubProps> = ({
  apiBaseUrl,
  wsBaseUrl,
  token,
  onBack,
  currentUser,
}) => {
  // State Management
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [selectedChatRoom, setSelectedChatRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'unread' | 'groups'>('all');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [typingUsers, setTypingUsers] = useState<{ [roomId: number]: User[] }>({});
  const [onlineUsers, setOnlineUsers] = useState<Set<number>>(new Set());

  // WebSocket State
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const [isConnected, setIsConnected] = useState(false);
  const pingInterval = useRef<NodeJS.Timeout | null>(null);
  const maxReconnectAttempts = 10;
  const isReconnecting = useRef(false);

  // Pagination
  const [messagesPage, setMessagesPage] = useState(1);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  // ============= API FUNCTIONS =============
  const apiCall = async (endpoint: string, data: any): Promise<any> => {
    try {
      const response = await fetch(`${apiBaseUrl}/citadel_hub/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, ...data }),
      });
      
      if (!response.ok) {
        throw new Error(`API call failed: ${response.status}`);
      }
      
      return response.json();
    } catch (error) {
      console.error(`API call error (${endpoint}):`, error);
      throw error;
    }
  };

  // ============= DATA LOADING FUNCTIONS =============
  const loadChatRooms = useCallback(async () => {
    try {
      const result = await apiCall('getChatRooms', {});
      if (result.chat_rooms) {
        // Ensure all chat rooms have created_at
        const roomsWithCreatedAt = result.chat_rooms.map((room: any) => ({
          ...room,
          created_at: room.created_at || new Date().toISOString(),
        }));
        setChatRooms(roomsWithCreatedAt);
      }
    } catch (error) {
      console.error('Error loading chat rooms:', error);
    }
  }, [apiBaseUrl, token]);

  const loadMessages = useCallback(async (roomId: number, page: number = 1) => {
    if (isLoadingMessages) return;

    setIsLoadingMessages(true);
    try {
      const result = await apiCall('getMessages', {
        chat_room_id: roomId,
        page,
        page_size: 50,
      });

      if (result.messages) {
        if (page === 1) {
          setMessages(result.messages.reverse());
        } else {
          setMessages(prev => [...result.messages.reverse(), ...prev]);
        }
        setHasMoreMessages(result.messages.length === 50);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setIsLoadingMessages(false);
    }
  }, [apiBaseUrl, token]);

  const loadNotifications = useCallback(async () => {
    try {
      const result = await apiCall('getNotifications', { page: 1, page_size: 100 });
      if (result.notifications) {
        setNotifications(result.notifications);
      }

      const countResult = await apiCall('getUnreadCount', {});
      if (countResult.unread_count !== undefined) {
        setUnreadCount(countResult.unread_count);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  }, [apiBaseUrl, token]);

  // ============= WEBSOCKET FUNCTIONS =============
  const cleanupWebSocket = useCallback(() => {
    if (pingInterval.current) {
      clearInterval(pingInterval.current);
      pingInterval.current = null;
    }
    
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
      reconnectTimeout.current = null;
    }
    
    if (ws.current) {
      // Remove all event listeners before closing
      ws.current.onopen = null;
      ws.current.onmessage = null;
      ws.current.onclose = null;
      ws.current.onerror = null;
      
      if (ws.current.readyState === WebSocket.OPEN || 
          ws.current.readyState === WebSocket.CONNECTING) {
        ws.current.close(1000, 'Cleanup');
      }
      
      ws.current = null;
    }
  }, []);

  const startPingInterval = useCallback(() => {
    // Clear existing interval
    if (pingInterval.current) {
      clearInterval(pingInterval.current);
    }
    
    // Send ping every 30 seconds to keep connection alive
    pingInterval.current = setInterval(() => {
      if (ws.current?.readyState === WebSocket.OPEN) {
        try {
          ws.current.send(JSON.stringify({ action: 'ping' }));
        } catch (error) {
          console.error('Error sending ping:', error);
        }
      }
    }, 30000);
  }, []);

  const connectWebSocket = useCallback(() => {
    // Prevent multiple simultaneous connection attempts
    if (isReconnecting.current) {
      console.log('Already attempting to reconnect...');
      return;
    }

    // Check if already connected
    if (ws.current?.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected');
      return;
    }

    // Check if currently connecting
    if (ws.current?.readyState === WebSocket.CONNECTING) {
      console.log('WebSocket is already connecting...');
      return;
    }

    // Check reconnection attempts
    if (reconnectAttempts.current >= maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      Alert.alert(
        'Connection Error',
        'Unable to connect to chat server. Please check your internet connection and restart the app.',
        [
          { 
            text: 'Retry', 
            onPress: () => { 
              reconnectAttempts.current = 0;
              connectWebSocket();
            } 
          },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
      return;
    }

    isReconnecting.current = true;

    try {
      console.log(`Connecting to WebSocket... (Attempt ${reconnectAttempts.current + 1}/${maxReconnectAttempts})`);
      
      // Clean up any existing connection
      cleanupWebSocket();
      
      const websocketUrl = `${wsBaseUrl}/ws/chat/?token=${token}`;
      const websocket = new WebSocket(websocketUrl);

      websocket.onopen = () => {
        console.log('✅ WebSocket Connected Successfully');
        setIsConnected(true);
        reconnectAttempts.current = 0;
        isReconnecting.current = false;
        
        // Start ping interval
        startPingInterval();
        
        // Rejoin current room if in chat
        if (selectedChatRoom) {
          setTimeout(() => {
            sendWebSocketMessage('join_room', { room_id: selectedChatRoom.id });
            sendWebSocketMessage('read_messages', { room_id: selectedChatRoom.id });
          }, 500);
        }
      };

      websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          // Handle pong response
          if (data.type === 'pong') {
            return;
          }

          // Handle room_joined acknowledgment
          if (data.type === 'room_joined') {
            console.log('Successfully joined room:', data.room_id);
            return;
          }

          switch (data.type) {
            case 'message':
              handleNewMessage(data.message);
              break;
            case 'message_edited':
              handleMessageEdited(data.message);
              break;
            case 'message_deleted':
              handleMessageDeleted(data.message_id);
              break;
            case 'typing':
              handleTyping(data.room_id, data.user_id, data.user_name);
              break;
            case 'stop_typing':
              handleStopTyping(data.room_id, data.user_id);
              break;
            case 'messages_read':
              handleMessagesRead(data.room_id, data.user_id);
              break;
            case 'reaction':
              handleReaction(data.message_id, data.user_id, data.user_name, data.emoji);
              break;
            case 'status_update':
              handleStatusUpdate(data.user_status);
              break;
            default:
              console.log('Unknown message type:', data.type);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      websocket.onclose = (event) => {
        console.log(`WebSocket Disconnected: ${event.code} - ${event.reason || 'No reason provided'}`);
        setIsConnected(false);
        isReconnecting.current = false;
        
        // Clear ping interval
        if (pingInterval.current) {
          clearInterval(pingInterval.current);
          pingInterval.current = null;
        }
        
        // Only attempt reconnection if not a normal closure
        if (event.code !== 1000) {
          reconnectAttempts.current += 1;
          
          // Exponential backoff with jitter
          const baseDelay = 1000;
          const maxDelay = 30000;
          const exponentialDelay = Math.min(
            baseDelay * Math.pow(2, reconnectAttempts.current),
            maxDelay
          );
          const jitter = Math.random() * 1000;
          const delay = exponentialDelay + jitter;
          
          console.log(
            `Reconnecting in ${Math.round(delay / 1000)}s... ` +
            `(Attempt ${reconnectAttempts.current}/${maxReconnectAttempts})`
          );
          
          reconnectTimeout.current = setTimeout(() => {
            connectWebSocket();
          }, delay);
        } else {
          console.log('WebSocket closed normally');
        }
      };

      websocket.onerror = (error: any) => {
        console.error('❌ WebSocket Error:', {
          message: error.message || 'Unknown error',
          type: error.type,
        });
        // Don't set isReconnecting to false here, onclose will handle it
      };

      ws.current = websocket;
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      isReconnecting.current = false;
      
      // Attempt reconnection after delay
      reconnectAttempts.current += 1;
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
      
      reconnectTimeout.current = setTimeout(() => {
        connectWebSocket();
      }, delay);
    }
  }, [wsBaseUrl, token, selectedChatRoom, cleanupWebSocket, startPingInterval]);

  // ============= WEBSOCKET MESSAGE HANDLERS =============
  const handleNewMessage = useCallback((message: Message) => {
    if (selectedChatRoom && message.chat_room === selectedChatRoom.id) {
      setMessages(prev => {
        // Check if message already exists
        const exists = prev.some(m => m.id === message.id);
        if (exists) {
          // Replace existing message
          return prev.map(m => m.id === message.id ? message : m);
        }
        
        // Remove temp messages with same content sent recently
        const filtered = prev.filter(m => {
          const isSameUser = (m.sender.id || m.sender.employee_id) === 
                            (currentUser.id || currentUser.employee_id);
          const isSameContent = m.content === message.content;
          
          if (isSameUser && isSameContent) {
            const timeDiff = new Date().getTime() - new Date(m.created_at).getTime();
            return timeDiff > 2000;
          }
          return true;
        });
        
        return [...filtered, message];
      });
      
      // Mark as read
      if (isConnected && ws.current?.readyState === WebSocket.OPEN) {
        sendWebSocketMessage('read_messages', { room_id: selectedChatRoom.id });
      }
    }
    
    loadChatRooms();
    loadNotifications();
  }, [selectedChatRoom, currentUser, isConnected]);

  const handleMessageEdited = useCallback((message: Message) => {
    setMessages(prev => prev.map(m => m.id === message.id ? message : m));
  }, []);

  const handleMessageDeleted = useCallback((messageId: number) => {
    setMessages(prev => prev.filter(m => m.id !== messageId));
  }, []);

  const handleTyping = useCallback((roomId: number, userId: number, userName: string) => {
    const user: User = {
      id: userId,
      employee_id: userId.toString(),
      first_name: userName.split(' ')[0] || userName,
      last_name: userName.split(' ')[1] || '',
      email: '',
    };

    setTypingUsers(prev => {
      const existingUsers = prev[roomId] || [];
      const alreadyTyping = existingUsers.some(u => 
        (u.id || parseInt(u.employee_id || '0')) === userId
      );
      
      if (alreadyTyping) return prev;
      
      return {
        ...prev,
        [roomId]: [...existingUsers, user],
      };
    });

    // Auto-remove after 3 seconds
    setTimeout(() => {
      handleStopTyping(roomId, userId);
    }, 3000);
  }, []);

  const handleStopTyping = useCallback((roomId: number, userId: number) => {
    setTypingUsers(prev => ({
      ...prev,
      [roomId]: (prev[roomId] || []).filter(u => 
        (u.id || parseInt(u.employee_id || '0')) !== userId
      ),
    }));
  }, []);

  const handleMessagesRead = useCallback((roomId: number, userId: number) => {
    loadChatRooms();
  }, [loadChatRooms]);

  const handleReaction = useCallback((
    messageId: number, 
    userId: number, 
    userName: string, 
    emoji: string
  ) => {
    const user: User = {
      id: userId,
      employee_id: userId.toString(),
      first_name: userName.split(' ')[0] || userName,
      last_name: userName.split(' ')[1] || '',
      email: '',
    };

    setMessages(prev => prev.map(m => {
      if (m.id === messageId) {
        const reactions = m.reactions || [];
        return {
          ...m,
          reactions: [...reactions, { id: Date.now(), user, emoji }],
        };
      }
      return m;
    }));
  }, []);

  const handleStatusUpdate = useCallback((userStatus: any) => {
    if (userStatus?.status === 'online' && userStatus?.user?.id) {
      setOnlineUsers(prev => new Set(prev).add(userStatus.user.id));
    } else if (userStatus?.user?.id) {
      setOnlineUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(userStatus.user.id);
        return newSet;
      });
    }
  }, []);

  const sendWebSocketMessage = useCallback((action: string, data: any) => {
    if (!ws.current || ws.current.readyState !== WebSocket.OPEN) {
      console.warn(`WebSocket is not connected (state: ${ws.current?.readyState}). Message not sent:`, action);
      return false;
    }

    try {
      ws.current.send(JSON.stringify({ action, ...data }));
      return true;
    } catch (error) {
      console.error('Error sending WebSocket message:', error);
      return false;
    }
  }, []);

  // ============= MESSAGE SENDING FUNCTIONS =============
  const sendMessage = async (
    content: string, 
    messageType: string = 'text', 
    file?: any, 
    parentMessageId?: number
  ) => {
    if (!selectedChatRoom) return;

    try {
      if (file) {
        // Handle file upload
        const formData = new FormData();
        formData.append('token', token || '');
        formData.append('chat_room_id', selectedChatRoom.id.toString());
        formData.append('content', content);
        formData.append('message_type', messageType);
        
        // Handle different file types properly
        let fileToUpload: any;
        
        // Check if it's from ImagePicker (has assets array) or DocumentPicker
        if (file.uri) {
          fileToUpload = {
            uri: file.uri,
            type: file.mimeType || file.type || 'application/octet-stream',
            name: file.name || file.fileName || `file_${Date.now()}.${messageType === 'image' ? 'jpg' : messageType === 'video' ? 'mp4' : 'file'}`,
          };
        } else {
          // Fallback for other file structures
          fileToUpload = {
            uri: file.uri || file.url,
            type: file.mimeType || file.type || 'application/octet-stream',
            name: file.name || file.fileName || `file_${Date.now()}`,
          };
        }
        
        formData.append('file', fileToUpload as any);
        
        if (parentMessageId) {
          formData.append('parent_message_id', parentMessageId.toString());
        }

        console.log('Uploading file:', fileToUpload.name, 'Type:', messageType);

        const response = await fetch(`${apiBaseUrl}/citadel_hub/sendMessage`, {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('File upload failed:', response.status, errorText);
          throw new Error(`File upload failed: ${response.status}`);
        }
        
        const result = await response.json();
        
        // Add the returned message immediately
        if (result.message) {
          setMessages(prev => {
            const exists = prev.some(m => m.id === result.message.id);
            if (!exists) {
              return [...prev, result.message];
            }
            return prev;
          });
          
          // Reload chat rooms to update last message
          loadChatRooms();
        }
      } else {
        // Optimistic UI update for text messages
        const tempMessage: Message = {
          id: Date.now(), // temporary ID
          sender: currentUser,
          content,
          message_type: messageType as any,
          created_at: new Date().toISOString(),
          is_edited: false,
          parent_message: parentMessageId 
            ? messages.find(m => m.id === parentMessageId) 
            : undefined,
          chat_room: selectedChatRoom.id,
        };
        
        // Add temp message immediately for instant feedback
        setMessages(prev => [...prev, tempMessage]);
        
        // Send via WebSocket
        const sent = sendWebSocketMessage('send_message', {
          room_id: selectedChatRoom.id,
          content,
          message_type: messageType,
          parent_message_id: parentMessageId,
        });

        // If WebSocket send failed, remove temp message and show error
        if (!sent) {
          setMessages(prev => prev.filter(m => m.id !== tempMessage.id));
          Alert.alert('Error', 'Failed to send message. Please check your connection.');
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    }
  };

  // ============= CHAT MANAGEMENT FUNCTIONS =============
  const createDirectChat = async (employeeId: string) => {
    try {
      const result = await apiCall('createDirectChat', { employee_id: employeeId });
      if (result.chat_room) {
        await loadChatRooms();
        setSelectedChatRoom({
          ...result.chat_room,
          created_at: result.chat_room.created_at || new Date().toISOString(),
        });
        setViewMode('chat');
      }
    } catch (error) {
      console.error('Error creating direct chat:', error);
      Alert.alert('Error', 'Failed to create chat. Please try again.');
    }
  };

  const createGroupChat = async (name: string, description: string, memberIds: number[]) => {
    try {
      const result = await apiCall('createGroupChat', {
        name,
        description,
        member_ids: memberIds,
      });
      if (result.chat_room) {
        await loadChatRooms();
        setSelectedChatRoom({
          ...result.chat_room,
          created_at: result.chat_room.created_at || new Date().toISOString(),
        });
        setViewMode('chat');
      }
    } catch (error) {
      console.error('Error creating group chat:', error);
      Alert.alert('Error', 'Failed to create group. Please try again.');
    }
  };

  const muteChat = async (roomId: number) => {
    try {
      await apiCall('muteChat', { chat_room_id: roomId });
      await loadChatRooms();
    } catch (error) {
      console.error('Error muting chat:', error);
    }
  };

  const unmuteChat = async (roomId: number) => {
    try {
      await apiCall('unmuteChat', { chat_room_id: roomId });
      await loadChatRooms();
    } catch (error) {
      console.error('Error unmuting chat:', error);
    }
  };

  const pinChat = useCallback((roomId: number) => {
    setChatRooms(prev => prev.map(room => 
      room.id === roomId ? { ...room, is_pinned: true } : room
    ));
  }, []);

  const unpinChat = useCallback((roomId: number) => {
    setChatRooms(prev => prev.map(room => 
      room.id === roomId ? { ...room, is_pinned: false } : room
    ));
  }, []);

  const markAsUnread = useCallback((roomId: number) => {
    setChatRooms(prev => prev.map(room => 
      room.id === roomId 
        ? { ...room, unread_count: (room.unread_count || 0) + 1 } 
        : room
    ));
  }, []);

  // ============= FILTERING FUNCTION =============
  const getFilteredChatRooms = useCallback(() => {
    let filtered = [...chatRooms];

    if (searchQuery) {
      filtered = filtered.filter(room => {
        if (room.room_type === 'group') {
          return room.name?.toLowerCase().includes(searchQuery.toLowerCase());
        } else {
          const otherMember = room.members.find(m => {
            const member = m as ChatRoomMember;
            const user = member.user || m as User;
            const userId = user?.id || user?.employee_id;
            const currentUserId = currentUser.id || currentUser.employee_id;
            return user && userId !== currentUserId;
          });
          
          if (otherMember) {
            const member = otherMember as ChatRoomMember;
            const user = member.user || otherMember as User;
            if (user) {
              const fullName = `${user.first_name} ${user.last_name}`.toLowerCase();
              return fullName.includes(searchQuery.toLowerCase());
            }
          }
          return false;
        }
      });
    }

    if (filterType === 'unread') {
      filtered = filtered.filter(room => (room.unread_count || 0) > 0);
    } else if (filterType === 'groups') {
      filtered = filtered.filter(room => room.room_type === 'group');
    }

    return filtered.sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      
      const aTime = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
      const bTime = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
      
      return bTime - aTime;
    });
  }, [chatRooms, searchQuery, filterType, currentUser]);

  const handleChatSelect = useCallback((room: ChatRoom) => {
    setSelectedChatRoom(room);
    setViewMode('chat');
  }, []);

  const loadMoreMessages = useCallback(() => {
    if (selectedChatRoom && hasMoreMessages && !isLoadingMessages) {
      const nextPage = messagesPage + 1;
      setMessagesPage(nextPage);
      loadMessages(selectedChatRoom.id, nextPage);
    }
  }, [selectedChatRoom, hasMoreMessages, isLoadingMessages, messagesPage, loadMessages]);

  // ============= EFFECTS =============
  // Initial setup
  useEffect(() => {
    loadChatRooms();
    loadNotifications();
    connectWebSocket();

    return () => {
      cleanupWebSocket();
    };
  }, []);

  // Handle selected chat room changes
  useEffect(() => {
    if (selectedChatRoom) {
      setMessagesPage(1);
      setHasMoreMessages(true);
      loadMessages(selectedChatRoom.id, 1);
      
      // Join room and mark as read if connected
      if (isConnected && ws.current?.readyState === WebSocket.OPEN) {
        setTimeout(() => {
          sendWebSocketMessage('join_room', { room_id: selectedChatRoom.id });
          sendWebSocketMessage('read_messages', { room_id: selectedChatRoom.id });
        }, 300);
      }
    }
  }, [selectedChatRoom?.id]);

  // ============= RENDER =============
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#008069" />

      {viewMode === 'list' && (
        <View style={styles.listView}>
          <Header
            currentUser={currentUser}
            unreadCount={unreadCount}
            onMenuClick={(action) => {
              if (action === 'newGroup') setViewMode('newGroup');
              if (action === 'newChat') setViewMode('newChat');
            }}
            onBack={() => {
              if (onBack) onBack();
            }}
          />
          <SearchAndFilter
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            filterType={filterType}
            onFilterChange={setFilterType}
          />
          <List
            chatRooms={getFilteredChatRooms()}
            currentUser={currentUser}
            onChatSelect={handleChatSelect}
            onMute={muteChat}
            onUnmute={unmuteChat}
            onPin={pinChat}
            onUnpin={unpinChat}
            onMarkAsUnread={markAsUnread}
          />
        </View>
      )}

      {viewMode === 'chat' && selectedChatRoom && (
        <Chat
          chatRoom={selectedChatRoom}
          messages={messages}
          currentUser={currentUser}
          typingUsers={typingUsers[selectedChatRoom.id] || []}
          onBack={() => setViewMode('list')}
          onHeaderClick={() => setViewMode('chatDetails')}
          onSendMessage={sendMessage}
          onTyping={() => sendWebSocketMessage('typing', { room_id: selectedChatRoom.id })}
          onStopTyping={() => sendWebSocketMessage('stop_typing', { room_id: selectedChatRoom.id })}
          onReact={(messageId, emoji) => 
            sendWebSocketMessage('react_message', { message_id: messageId, emoji })
          }
          onLoadMore={loadMoreMessages}
          hasMore={hasMoreMessages}
          isLoading={isLoadingMessages}
        />
      )}

      {viewMode === 'chatDetails' && selectedChatRoom && (
        <ChatDetails
          chatRoom={selectedChatRoom}
          currentUser={currentUser}
          onBack={() => setViewMode('chat')}
          onEdit={() => setViewMode('edit')}
          onMute={() => muteChat(selectedChatRoom.id)}
          onUnmute={() => unmuteChat(selectedChatRoom.id)}
        />
      )}

      {viewMode === 'newGroup' && (
        <NewGroup
          currentUser={currentUser}
          onBack={() => setViewMode('list')}
          onCreate={createGroupChat}
          apiCall={apiCall}
        />
      )}

      {viewMode === 'newChat' && (
        <NewChat
          currentUser={currentUser}
          onBack={() => setViewMode('list')}
          onCreate={createDirectChat}
          apiCall={apiCall}
        />
      )}

      {viewMode === 'edit' && selectedChatRoom && (
        <Edit
          chatRoom={selectedChatRoom}
          currentUser={currentUser}
          onBack={() => setViewMode('chatDetails')}
          onSave={async (name, description) => {
            try {
              await apiCall('updateGroupInfo', {
                chat_room_id: selectedChatRoom.id,
                name,
                description,
              });
              await loadChatRooms();
              setViewMode('chatDetails');
            } catch (error) {
              console.error('Error updating group:', error);
              Alert.alert('Error', 'Failed to update group. Please try again.');
            }
          }}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  listView: {
    flex: 1,
  },
});