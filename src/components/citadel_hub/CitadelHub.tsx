import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Alert,
  Platform,
  TouchableOpacity,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Header } from './header';
import { SearchAndFilter } from './searchAndFilter';
import { List } from './list';
import { Chat } from './chat';
import { ChatDetails } from './chatDetails';
import { NewGroup } from './newGroup';
import { NewChat } from './newChat';
import { Edit } from './edit';
import ShareScreen from './share';
import { AddMember } from './addMember';
import { Ionicons } from '@expo/vector-icons'; 

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
  is_deleted?: boolean;
  deleted_for_me?: boolean;
  parent_message?: Message;
  reactions?: MessageReaction[];
  file_url?: string;
  file_name?: string;
  chat_room?: number;
  is_forwarded?: boolean;  
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

export type ViewMode = 'list' | 'chat' | 'chatDetails' | 'newGroup' | 'newChat' | 'edit' | 'share' | 'addMember';

interface CitadelHubProps {
  apiBaseUrl: string;
  wsBaseUrl: string;
  token: string | null;
  onBack?: () => void;
  currentUser: User;
}

interface PendingAction {
  id: string;
  type: 'delete_for_me' | 'delete_for_everyone' | 'react' | 'clear_chat';
  roomId: number;
  messageId?: number;
  data: any;
  timestamp: number;
  status: 'pending' | 'completed' | 'failed';
}

// ============= CACHE KEYS =============
const CACHE_KEYS = {
  MESSAGES: (roomId: number) => `message_cache_${roomId}`,
  CHAT_ROOMS: 'chat_rooms_cache',
  PENDING_ACTIONS: 'pending_actions_cache',
};

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

  // Cache & Optimistic Updates
  const [messageCache, setMessageCache] = useState<{ [roomId: number]: Message[] }>({});
  const [pendingActions, setPendingActions] = useState<PendingAction[]>([]);
  const [isInitialCacheLoaded, setIsInitialCacheLoaded] = useState(false);

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

  const [searchResults, setSearchResults] = useState<Message[]>([]);
  const [hasMoreSearchResults, setHasMoreSearchResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [shareData, setShareData] = useState<{
    messageIds: number[];
    messages: Message[];
    chatRoomId?: number;
  } | null>(null);

  const handleShare = useCallback((messageIds: number[], messages: Message[], chatRoomId?: number) => {
    setShareData({ messageIds, messages, chatRoomId });
    setViewMode('share');
  }, []);

  const handleBackFromShare = useCallback(() => {
    setShareData(null);
    setViewMode('chat');
  }, []);

  // ============= CACHE MANAGEMENT =============
  const loadCache = useCallback(async () => {
    try {
      if (Platform.OS === 'web') return;

      // Load message cache
      const cacheKeys = await AsyncStorage.getAllKeys();
      const messageCacheKeys = cacheKeys.filter(key => key.startsWith('message_cache_'));

      const newCache: { [roomId: number]: Message[] } = {};

      for (const key of messageCacheKeys) {
        const roomId = parseInt(key.replace('message_cache_', ''));
        const cachedData = await AsyncStorage.getItem(key);
        if (cachedData) {
          newCache[roomId] = JSON.parse(cachedData);
        }
      }

      setMessageCache(newCache);

      // Load pending actions
      const pendingActionsData = await AsyncStorage.getItem(CACHE_KEYS.PENDING_ACTIONS);
      if (pendingActionsData) {
        setPendingActions(JSON.parse(pendingActionsData));
      }

      setIsInitialCacheLoaded(true);
    } catch (error) {
      console.error('Error loading cache:', error);
    }
  }, []);

  const saveMessageCache = useCallback(async (roomId: number, messages: Message[]) => {
    try {
      // Update in-memory cache
      setMessageCache(prev => ({
        ...prev,
        [roomId]: messages
      }));

      // Save to persistent storage
      if (Platform.OS !== 'web') {
        await AsyncStorage.setItem(
          CACHE_KEYS.MESSAGES(roomId),
          JSON.stringify(messages.slice(-200)) // Keep last 200 messages
        );
      }
    } catch (error) {
      console.error('Error saving message cache:', error);
    }
  }, []);

  const savePendingActions = useCallback(async (actions: PendingAction[]) => {
    try {
      if (Platform.OS !== 'web') {
        await AsyncStorage.setItem(
          CACHE_KEYS.PENDING_ACTIONS,
          JSON.stringify(actions.slice(-50)) // Keep last 50 pending actions
        );
      }
    } catch (error) {
      console.error('Error saving pending actions:', error);
    }
  }, []);

  const addPendingAction = useCallback((action: Omit<PendingAction, 'id' | 'timestamp' | 'status'>) => {
    const newAction: PendingAction = {
      ...action,
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      status: 'pending',
    };

    setPendingActions(prev => {
      const updated = [newAction, ...prev].slice(0, 50); // Keep only recent 50
      savePendingActions(updated);
      return updated;
    });

    return newAction.id;
  }, [savePendingActions]);

  const updatePendingActionStatus = useCallback((actionId: string, status: 'completed' | 'failed') => {
    setPendingActions(prev => {
      const updated = prev.map(action =>
        action.id === actionId ? { ...action, status } : action
      ).filter(action =>
        !(action.status === 'completed' && Date.now() - action.timestamp > 30000) // Remove completed after 30s
      );
      savePendingActions(updated);
      return updated;
    });
  }, [savePendingActions]);

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

  const loadMessages = useCallback(async (roomId: number, page: number = 1, useCache: boolean = true) => {
    if (isLoadingMessages) return;

    setIsLoadingMessages(true);

    try {
      // Show cached messages immediately for instant loading
      if (useCache && page === 1 && messageCache[roomId] && messageCache[roomId].length > 0) {
        setMessages(messageCache[roomId]);
      }

      const result = await apiCall('getMessages', {
        chat_room_id: roomId,
        page,
        page_size: 50,
      });

      if (result.messages) {
        const newMessages = result.messages.reverse();

        if (page === 1) {
          // Merge with cache, preferring fresh messages
          const cachedMessages = messageCache[roomId] || [];
          const mergedMessages = mergeMessages(newMessages, cachedMessages);
          setMessages(mergedMessages);
          saveMessageCache(roomId, mergedMessages);
        } else {
          const mergedMessages = mergeMessages(newMessages, messages);
          setMessages(mergedMessages);
          saveMessageCache(roomId, mergedMessages);
        }

        setHasMoreMessages(result.messages.length === 50);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      // If API fails and no cache, show error
      if (page === 1 && (!messageCache[roomId] || messageCache[roomId].length === 0)) {
        Alert.alert('Error', 'Failed to load messages. Please check your connection.');
      }
    } finally {
      setIsLoadingMessages(false);
    }
  }, [apiBaseUrl, token, messageCache, saveMessageCache]);

  // Helper function to merge messages (new messages override cached ones)
  const mergeMessages = (newMessages: Message[], cachedMessages: Message[]): Message[] => {
    const messageMap = new Map<number, Message>();

    // Add cached messages first
    cachedMessages.forEach(msg => messageMap.set(msg.id, msg));

    // Override with new messages (these are fresher)
    newMessages.forEach(msg => messageMap.set(msg.id, msg));

    return Array.from(messageMap.values()).sort((a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  };

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

  // ============= OPTIMISTIC UPDATE FUNCTIONS =============
  const performOptimisticUpdate = useCallback((action: {
    type: 'delete_for_me' | 'delete_for_everyone' | 'react' | 'clear_chat';
    roomId: number;
    messageId?: number;
    data: any;
  }) => {
    const { type, roomId, messageId, data } = action;

    // Generate pending action ID
    const actionId = addPendingAction({
      type,
      roomId,
      messageId,
      data,
    });

    // Perform optimistic update on UI
    switch (type) {
      case 'delete_for_me':
        setMessages(prev => {
          const updated = prev.filter(m => m.id !== messageId);
          saveMessageCache(roomId, updated);
          return updated;
        });
        break;

      case 'delete_for_everyone':
        setMessages(prev => {
          const updated = prev.map(m => {
            if (m.id === messageId) {
              return {
                ...m,
                content: 'This message was deleted',
                is_deleted: true,
                message_type: 'text',
                file_url: undefined,
                file_name: undefined,
                reactions: [],
              };
            }
            return m;
          });
          saveMessageCache(roomId, updated);
          return updated;
        });
        break;

      case 'react':
        setMessages(prev => {
          const updated = prev.map(m => {
            if (m.id === messageId) {
              const existingReactions = m.reactions || [];
              const userReactionIndex = existingReactions.findIndex(r =>
                (r.user.id || r.user.employee_id) ===
                (currentUser.id || currentUser.employee_id)
              );

              let newReactions;
              if (userReactionIndex > -1) {
                // Update existing reaction
                newReactions = [...existingReactions];
                newReactions[userReactionIndex] = {
                  ...newReactions[userReactionIndex],
                  emoji: data.emoji,
                };
              } else {
                // Add new reaction
                newReactions = [...existingReactions, {
                  id: Date.now(),
                  user: currentUser,
                  emoji: data.emoji,
                }];
              }

              return {
                ...m,
                reactions: newReactions
              };
            }
            return m;
          });
          saveMessageCache(roomId, updated);
          return updated;
        });
        break;

      case 'clear_chat':
        setMessages([]);
        saveMessageCache(roomId, []);

        // Also update chat rooms list
        setChatRooms(prev => prev.map(room =>
          room.id === roomId
            ? { ...room, last_message_at: undefined, unread_count: 0 }
            : room
        ));
        break;
    }

    return actionId;
  }, [currentUser, saveMessageCache, addPendingAction]);

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
    if (pingInterval.current) {
      clearInterval(pingInterval.current);
    }

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
    if (isReconnecting.current) {
      console.log('Already attempting to reconnect...');
      return;
    }

    if (ws.current?.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected');
      return;
    }

    if (ws.current?.readyState === WebSocket.CONNECTING) {
      console.log('WebSocket is already connecting...');
      return;
    }

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

      cleanupWebSocket();

      const websocketUrl = `${wsBaseUrl}/ws/chat/?token=${token}`;
      const websocket = new WebSocket(websocketUrl);

      websocket.onopen = () => {
        console.log('✅ WebSocket Connected Successfully');
        setIsConnected(true);
        reconnectAttempts.current = 0;
        isReconnecting.current = false;

        startPingInterval();

        // Retry pending actions
        retryPendingActions();

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

          if (data.type === 'pong' || data.type === 'room_joined') {
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
              handleMessageDeleted(data);
              break;
            case 'message_deleted_for_me':
              handleMessageDeletedForMe(data);
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
              handleReactionUpdate(data);
              break;
            case 'message_reaction':
              handleReactionUpdate(data);
              break;
            case 'status_update':
              handleStatusUpdate(data.user_status);
              break;
            case 'search_results':
              handleSearchResults(data);
              break;
            case 'chat_cleared':
              handleChatCleared(data);
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

        if (pingInterval.current) {
          clearInterval(pingInterval.current);
          pingInterval.current = null;
        }

        if (event.code !== 1000) {
          reconnectAttempts.current += 1;

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
      };

      ws.current = websocket;
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      isReconnecting.current = false;

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
        const exists = prev.some(m => m.id === message.id);
        if (exists) {
          const updated = prev.map(m => m.id === message.id ? message : m);
          saveMessageCache(selectedChatRoom.id, updated);
          return updated;
        }

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

        const updated = [...filtered, message];
        saveMessageCache(selectedChatRoom.id, updated);
        return updated;
      });

      // Mark as read
      if (isConnected && ws.current?.readyState === WebSocket.OPEN) {
        sendWebSocketMessage('read_messages', { room_id: selectedChatRoom.id });
      }
    }

    loadChatRooms();
    loadNotifications();
  }, [selectedChatRoom, currentUser, isConnected, saveMessageCache, loadChatRooms, loadNotifications]);

  const handleMessageDeletedForMe = useCallback((data: any) => {
    const { message_id, room_id } = data;

    if (selectedChatRoom && selectedChatRoom.id === room_id) {
      setMessages(prev => {
        const updated = prev.filter(m => m.id !== parseInt(message_id));
        saveMessageCache(room_id, updated);
        return updated;
      });

      // Mark pending action as completed
      const pendingAction = pendingActions.find(action =>
        action.type === 'delete_for_me' &&
        action.messageId === parseInt(message_id) &&
        action.status === 'pending'
      );

      if (pendingAction) {
        updatePendingActionStatus(pendingAction.id, 'completed');
      }
    }
  }, [selectedChatRoom, pendingActions, updatePendingActionStatus, saveMessageCache]);

  const handleMessageDeleted = useCallback((data: any) => {
    const { message_id, deleted_for, room_id } = data;

    if (selectedChatRoom && selectedChatRoom.id === room_id && deleted_for === 'everyone') {
      setMessages(prev => {
        const updated = prev.map(m => {
          if (m.id === parseInt(message_id)) {
            return {
              ...m,
              content: 'This message was deleted',
              is_deleted: true,
              message_type: 'text',
              file_url: undefined,
              file_name: undefined,
              reactions: [],
            };
          }
          return m;
        });
        saveMessageCache(room_id, updated);
        return updated;
      });

      // Mark pending action as completed
      const pendingAction = pendingActions.find(action =>
        action.type === 'delete_for_everyone' &&
        action.messageId === parseInt(message_id) &&
        action.status === 'pending'
      );

      if (pendingAction) {
        updatePendingActionStatus(pendingAction.id, 'completed');
      }
    }
  }, [selectedChatRoom, pendingActions, updatePendingActionStatus, saveMessageCache]);

  const handleReactionUpdate = useCallback((data: any) => {
    const { message_id, reaction, room_id } = data;

    if (selectedChatRoom && selectedChatRoom.id === room_id) {
      setMessages(prev => {
        const updated = prev.map(m => {
          if (m.id === parseInt(message_id)) {
            const existingReactions = m.reactions || [];
            const userReactionIndex = existingReactions.findIndex(r =>
              (r.user.id || r.user.employee_id) ===
              (reaction.user.id || reaction.user.employee_id)
            );

            let newReactions;
            if (userReactionIndex > -1) {
              newReactions = [...existingReactions];
              newReactions[userReactionIndex] = reaction;
            } else {
              newReactions = [...existingReactions, reaction];
            }

            return {
              ...m,
              reactions: newReactions
            };
          }
          return m;
        });
        saveMessageCache(room_id, updated);
        return updated;
      });

      // Mark pending action as completed
      const pendingAction = pendingActions.find(action =>
        action.type === 'react' &&
        action.messageId === parseInt(message_id) &&
        action.data.emoji === reaction.emoji &&
        action.status === 'pending'
      );

      if (pendingAction) {
        updatePendingActionStatus(pendingAction.id, 'completed');
      }
    }
  }, [selectedChatRoom, pendingActions, updatePendingActionStatus, saveMessageCache]);

  const handleChatCleared = useCallback((data: any) => {
    const { room_id } = data;

    if (selectedChatRoom && selectedChatRoom.id === room_id) {
      setMessages([]);
      saveMessageCache(room_id, []);

      // Update chat rooms list
      setChatRooms(prev => prev.map(room =>
        room.id === room_id
          ? { ...room, last_message_at: undefined, unread_count: 0 }
          : room
      ));

      // Mark pending action as completed
      const pendingAction = pendingActions.find(action =>
        action.type === 'clear_chat' &&
        action.roomId === room_id &&
        action.status === 'pending'
      );

      if (pendingAction) {
        updatePendingActionStatus(pendingAction.id, 'completed');
      }
    }
  }, [selectedChatRoom, pendingActions, updatePendingActionStatus, saveMessageCache]);

  const handleMessageEdited = useCallback((message: Message) => {
    setMessages(prev => {
      const updated = prev.map(m => m.id === message.id ? message : m);
      if (message.chat_room) {
        saveMessageCache(message.chat_room, updated);
      }
      return updated;
    });
  }, [saveMessageCache]);

  const handleSearchResults = useCallback((data: any) => {
    const { query, messages: results, offset, has_more } = data;

    setSearchResults(prev => {
      if (offset === 0) {
        return results;
      }
      return [...prev, ...results];
    });

    setHasMoreSearchResults(has_more);
    setIsSearching(false);
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

  // ============= ACTION HANDLERS WITH OPTIMISTIC UPDATES =============
  const handleDeleteForMe = useCallback((messageId: number) => {
    if (!selectedChatRoom) return;

    // Perform optimistic update
    const actionId = performOptimisticUpdate({
      type: 'delete_for_me',
      roomId: selectedChatRoom.id,
      messageId,
      data: {},
    });

    // Send WebSocket message
    const sent = sendWebSocketMessage('delete_message_for_me', {
      message_id: messageId,
    });

    if (!sent) {
      // Mark as failed if WebSocket not connected
      setTimeout(() => {
        updatePendingActionStatus(actionId, 'failed');
      }, 1000);
    }
  }, [selectedChatRoom, performOptimisticUpdate, sendWebSocketMessage, updatePendingActionStatus]);

  const handleDeleteForEveryone = useCallback((messageId: number) => {
    if (!selectedChatRoom) return;

    // Check if message is within 30 minutes
    const message = messages.find(m => m.id === messageId);
    if (message) {
      const messageTime = new Date(message.created_at).getTime();
      const currentTime = new Date().getTime();
      const timeDiff = currentTime - messageTime;
      const thirtyMinutes = 30 * 60 * 1000;

      if (timeDiff > thirtyMinutes) {
        Alert.alert('Cannot Delete', 'You can only delete messages within 30 minutes of sending.');
        return;
      }
    }

    // Perform optimistic update
    const actionId = performOptimisticUpdate({
      type: 'delete_for_everyone',
      roomId: selectedChatRoom.id,
      messageId,
      data: {},
    });

    // Send WebSocket message
    const sent = sendWebSocketMessage('delete_message', {
      message_id: messageId,
    });

    if (!sent) {
      setTimeout(() => {
        updatePendingActionStatus(actionId, 'failed');
      }, 1000);
    }
  }, [selectedChatRoom, messages, performOptimisticUpdate, sendWebSocketMessage, updatePendingActionStatus]);

  const handleReact = useCallback((messageId: number, emoji: string) => {
    if (!selectedChatRoom) return;

    // Perform optimistic update
    const actionId = performOptimisticUpdate({
      type: 'react',
      roomId: selectedChatRoom.id,
      messageId,
      data: { emoji },
    });

    // Send WebSocket message
    const sent = sendWebSocketMessage('react_message', {
      message_id: messageId,
      emoji,
    });

    if (!sent) {
      setTimeout(() => {
        updatePendingActionStatus(actionId, 'failed');
      }, 1000);
    }
  }, [selectedChatRoom, performOptimisticUpdate, sendWebSocketMessage, updatePendingActionStatus]);

  const handleClearChat = useCallback(() => {
    if (!selectedChatRoom) return;

    Alert.alert(
      'Clear Chat',
      'Are you sure you want to clear this chat? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            // Perform optimistic update
            const actionId = performOptimisticUpdate({
              type: 'clear_chat',
              roomId: selectedChatRoom.id,
              data: {},
            });

            // Send WebSocket message
            const sent = sendWebSocketMessage('clear_chat', {
              room_id: selectedChatRoom.id,
            });

            if (!sent) {
              setTimeout(() => {
                updatePendingActionStatus(actionId, 'failed');
              }, 1000);
            }
          }
        }
      ]
    );
  }, [selectedChatRoom, performOptimisticUpdate, sendWebSocketMessage, updatePendingActionStatus]);

  const retryPendingActions = useCallback(() => {
    pendingActions.forEach(action => {
      if (action.status === 'pending' || action.status === 'failed') {
        switch (action.type) {
          case 'delete_for_me':
            if (action.messageId) {
              sendWebSocketMessage('delete_message_for_me', {
                message_id: action.messageId,
              });
            }
            break;
          case 'delete_for_everyone':
            if (action.messageId) {
              sendWebSocketMessage('delete_message', {
                message_id: action.messageId,
              });
            }
            break;
          case 'react':
            if (action.messageId) {
              sendWebSocketMessage('react_message', {
                message_id: action.messageId,
                emoji: action.data.emoji,
              });
            }
            break;
          case 'clear_chat':
            sendWebSocketMessage('clear_chat', {
              room_id: action.roomId,
            });
            break;
        }
      }
    });
  }, [pendingActions, sendWebSocketMessage]);

  // ============= WEBSOCKET UTILITIES =============
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
  const handleAddMember = useCallback(() => {
  // You can either navigate to a new screen or show a modal
  // For now, let's show an alert as a placeholder
  Alert.alert(
    'Add Member',
    'This feature will open a member selection screen',
    [
      {
        text: 'OK',
        onPress: () => {
          // TODO: Navigate to member selection screen
          // navigation.navigate('AddMemberScreen', { 
          //   groupId: selectedChatRoom.id,
          //   currentMembers: selectedChatRoom.members 
          // });
        }
      },
      { text: 'Cancel', style: 'cancel' }
    ]
  );
}, [selectedChatRoom]);

  // ============= MESSAGE SENDING =============
  const sendMessage = async (
    content: string,
    messageType: string = 'text',
    file?: any,
    parentMessageId?: number
  ) => {
    if (!selectedChatRoom) return;

    try {
      if (file) {
        const formData = new FormData();
        formData.append('token', token || '');
        formData.append('chat_room_id', selectedChatRoom.id.toString());
        formData.append('content', content);
        formData.append('message_type', messageType);

        let fileToUpload: any;

        if (file.uri) {
          fileToUpload = {
            uri: file.uri,
            type: file.mimeType || file.type || 'application/octet-stream',
            name: file.name || file.fileName || `file_${Date.now()}.${messageType === 'image' ? 'jpg' : messageType === 'video' ? 'mp4' : 'file'}`,
          };
        } else {
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

        const response = await fetch(`${apiBaseUrl}/citadel_hub/sendMessage`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`File upload failed: ${response.status}`);
        }

        const result = await response.json();

        if (result.message) {
          setMessages(prev => {
            const exists = prev.some(m => m.id === result.message.id);
            if (!exists) {
              const updated = [...prev, result.message];
              saveMessageCache(selectedChatRoom.id, updated);
              return updated;
            }
            return prev;
          });

          loadChatRooms();
        }
      } else {
        // Optimistic update for text messages
        const tempMessage: Message = {
          id: Date.now(),
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

        setMessages(prev => {
          const updated = [...prev, tempMessage];
          saveMessageCache(selectedChatRoom.id, updated);
          return updated;
        });

        const sent = sendWebSocketMessage('send_message', {
          room_id: selectedChatRoom.id,
          content,
          message_type: messageType,
          parent_message_id: parentMessageId,
        });

        if (!sent) {
          setMessages(prev => {
            const updated = prev.filter(m => m.id !== tempMessage.id);
            saveMessageCache(selectedChatRoom.id, updated);
            return updated;
          });
          Alert.alert('Error', 'Failed to send message. Please check your connection.');
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    }
  };

  // ============= FILTERING =============
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

  // ============= EVENT HANDLERS =============
  const handleChatSelect = useCallback((room: ChatRoom) => {
    setSelectedChatRoom(room);
    setViewMode('chat');
  }, []);

  const loadMoreMessages = useCallback(() => {
    if (selectedChatRoom && hasMoreMessages && !isLoadingMessages) {
      const nextPage = messagesPage + 1;
      setMessagesPage(nextPage);
      loadMessages(selectedChatRoom.id, nextPage, false);
    }
  }, [selectedChatRoom, hasMoreMessages, isLoadingMessages, messagesPage, loadMessages]);

  const handleSearch = useCallback((query: string, offset: number) => {
    if (!selectedChatRoom) return;

    sendWebSocketMessage('search_messages', {
      room_id: selectedChatRoom.id,
      query,
      offset,
      limit: 100,
    });
  }, [selectedChatRoom, sendWebSocketMessage]);

  // ============= EFFECTS =============
  useEffect(() => {
    loadCache();
    loadChatRooms();
    loadNotifications();
    connectWebSocket();

    return () => {
      cleanupWebSocket();
    };
  }, []);

  useEffect(() => {
    if (selectedChatRoom && isInitialCacheLoaded) {
      setMessagesPage(1);
      setHasMoreMessages(true);

      // Load messages with cache
      loadMessages(selectedChatRoom.id, 1, true);

      // Join room and mark as read if connected
      if (isConnected && ws.current?.readyState === WebSocket.OPEN) {
        setTimeout(() => {
          sendWebSocketMessage('join_room', { room_id: selectedChatRoom.id });
          sendWebSocketMessage('read_messages', { room_id: selectedChatRoom.id });
        }, 300);
      }
    }
  }, [selectedChatRoom?.id, isInitialCacheLoaded]);

  // Retry pending actions when connected
  useEffect(() => {
    if (isConnected && pendingActions.length > 0) {
      retryPendingActions();
    }
  }, [isConnected, pendingActions, retryPendingActions]);

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
    
    {/* NEW: Floating Action Button */}
    <TouchableOpacity
      style={styles.fab}
      onPress={() => setViewMode('newChat')}
      activeOpacity={0.8}
    >
      <Ionicons name="chatbubble" size={24} color="#ffffff" />
    </TouchableOpacity>
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
          onReact={handleReact}
          onLoadMore={loadMoreMessages}
          hasMore={hasMoreMessages}
          isLoading={isLoadingMessages}
          onSearch={handleSearch}
          onClearChat={handleClearChat}
          onDeleteForMe={handleDeleteForMe}
          onDeleteForEveryone={handleDeleteForEveryone}
          onShare={handleShare} // Add this prop
        />
      )}
      {viewMode === 'share' && shareData && (
        <ShareScreen
          messageIds={shareData.messageIds}
          messages={shareData.messages}
          chatRoomId={shareData.chatRoomId}
          apiBaseUrl={apiBaseUrl}
          token={token || ''}
          currentUser={currentUser}
          onBack={handleBackFromShare}
          onShareComplete={handleBackFromShare}
          apiCall={apiCall}
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
          onAddMember={handleAddMember} 
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
          onCreateGroup={() => setViewMode('newGroup')}
          apiCall={apiCall}
        />
      )}


{viewMode === 'edit' && selectedChatRoom && selectedChatRoom.room_type === 'group' && (
  <Edit
    chatRoom={selectedChatRoom}
    currentUser={currentUser}
    onBack={() => setViewMode('chatDetails')}
    onSave={async (name, description, image) => {
      try {
        const formData = new FormData();
        formData.append('token', token || '');
        formData.append('chat_room_id', selectedChatRoom.id.toString());

        // Only append name for groups
        if (selectedChatRoom.room_type === 'group') {
          formData.append('name', name);
        }
        formData.append('description', description);

        if (image) {
          const imageFile = {
            uri: image,
            type: 'image/jpeg',
            name: `${selectedChatRoom.room_type}_${selectedChatRoom.id}_${Date.now()}.jpg`,
          };
          formData.append('profile_picture', imageFile as any);
        }

        // Use different endpoint based on chat type
        const endpoint = selectedChatRoom.room_type === 'group'
          ? 'updateGroupInfo'
          : 'updateDirectChatInfo';
          console.log('🔍 Using endpoint:', endpoint, 'for room type:', selectedChatRoom.room_type);

        const response = await fetch(
          `${apiBaseUrl}/citadel_hub/${endpoint}`,
          {
            method: 'POST',
            body: formData,
          }
        );
        
        if (!response.ok) {
          throw new Error(`Update failed: ${response.status}`);
        }
        
        const result = await response.json();
        
        console.log('✅ Update successful:', result);
        
        // Update selectedChatRoom for ChatDetails
        if (result.chat_room) {
          const updatedRoom = {
            ...selectedChatRoom,
            ...result.chat_room,
            created_at: selectedChatRoom.created_at,
          };
          
          setSelectedChatRoom(updatedRoom);
          
          // Update chatRooms list for List component
          setChatRooms(prev => prev.map(room =>
            room.id === selectedChatRoom.id ? updatedRoom : room
          ));
          
          console.log('✅ States updated with new image URL:', updatedRoom.profile_picture);
        }

        // Refresh chat rooms list from server to ensure consistency
        await loadChatRooms();
        
        setViewMode('chatDetails');
        
      } catch (error) {
        console.error('❌ Error updating group:', error);
        Alert.alert('Error', `Failed to update ${selectedChatRoom.room_type === 'group' ? 'group' : 'profile'}. Please try again.`);
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
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#00a884',  // WhatsApp green
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,  // Android shadow
  },
});