import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, SafeAreaView, StatusBar } from 'react-native';
import { Header } from './header';
import { SearchAndFilter } from './searchAndFilter';
import { List } from './list';
import { Chat } from './chat';
import { ChatDetails } from './chatDetails';
import { NewGroup } from './newGroup';
import { NewChat } from './newChat';
import { Edit } from './edit';
import {
  User,
  ChatRoom,
  ChatRoomMember,
  Message,
  MessageReaction,
  MessageRead,
  Notification,
  ViewMode,
} from './citadelTypes';

interface CitadelHubProps {
  apiBaseUrl: string;
  wsBaseUrl: string;
  token: string | null;
  onBack?: () => void;
  currentUser: User;
}

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

  // WebSocket
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Pagination
  const [messagesPage, setMessagesPage] = useState(1);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  // API Calls
  const apiCall = async (endpoint: string, data: any) => {
    try {
      const response = await fetch(`${apiBaseUrl}/citadel_hub/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, ...data }),
      });
      return response.json();
    } catch (error) {
      console.error('API call error:', error);
      throw error;
    }
  };

  // Load Chat Rooms
  const loadChatRooms = useCallback(async () => {
    try {
      const result = await apiCall('getChatRooms', {});
      if (result.chat_rooms) {
        setChatRooms(result.chat_rooms);
      }
    } catch (error) {
      console.error('Error loading chat rooms:', error);
    }
  }, [apiBaseUrl, token]);

  // Load Messages
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
  }, [apiBaseUrl, token, isLoadingMessages]);

  // Load Notifications
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

  // WebSocket Connection
  const connectWebSocket = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) return;
    console.log(currentUser);
    const websocket = new WebSocket(`${wsBaseUrl}/ws/chat/?token=${token}`);

    websocket.onopen = () => {
      console.log('WebSocket Connected');
      setIsConnected(true);
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
        reconnectTimeout.current = null;
      }
    };

    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);

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
      }
    };

    websocket.onclose = () => {
      console.log('WebSocket Disconnected');
      setIsConnected(false);
      reconnectTimeout.current = setTimeout(() => {
        connectWebSocket();
      }, 3000);
    };

    websocket.onerror = (error) => {
      console.error('WebSocket Error:', error);
    };

    ws.current = websocket;
  }, [wsBaseUrl, token]);

  // WebSocket Handlers
  const handleNewMessage = (message: Message) => {
    if (selectedChatRoom && message.chat_room === selectedChatRoom.id) {
      setMessages(prev => [...prev, message]);
      sendWebSocketMessage('read_messages', { room_id: selectedChatRoom.id });
    }
    loadChatRooms();
    loadNotifications();
  };

  const handleMessageEdited = (message: Message) => {
    setMessages(prev => prev.map(m => m.id === message.id ? message : m));
  };

  const handleMessageDeleted = (messageId: number) => {
    setMessages(prev => prev.filter(m => m.id !== messageId));
  };

  const handleTyping = (roomId: number, userId: number, userName: string) => {
    const user: User = {
      id: userId,
      employee_id: userId.toString(),
      first_name: userName.split(' ')[0],
      last_name: userName.split(' ')[1] || '',
      email: '',
    };

    setTypingUsers(prev => ({
      ...prev,
      [roomId]: [...(prev[roomId] || []), user],
    }));

    setTimeout(() => {
      setTypingUsers(prev => ({
        ...prev,
        [roomId]: (prev[roomId] || []).filter(u => u.id !== userId),
      }));
    }, 3000);
  };

  const handleStopTyping = (roomId: number, userId: number) => {
    setTypingUsers(prev => ({
      ...prev,
      [roomId]: (prev[roomId] || []).filter(u => u.id !== userId),
    }));
  };

  const handleMessagesRead = (roomId: number, userId: number) => {
    loadChatRooms();
  };

  const handleReaction = (messageId: number, userId: number, userName: string, emoji: string) => {
    const user: User = {
      id: userId,
      employee_id: userId.toString(),
      first_name: userName.split(' ')[0],
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
  };

  const handleStatusUpdate = (userStatus: any) => {
    if (userStatus.status === 'online') {
      setOnlineUsers(prev => new Set(prev).add(userStatus.user.id));
    } else {
      setOnlineUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(userStatus.user.id);
        return newSet;
      });
    }
  };

  const sendWebSocketMessage = (action: string, data: any) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ action, ...data }));
    }
  };

  const sendMessage = async (content: string, messageType: string = 'text', file?: any, parentMessageId?: number) => {
    if (!selectedChatRoom) return;

    try {
      if (file) {
        const formData = new FormData();
        formData.append('token', token || '');
        formData.append('chat_room_id', selectedChatRoom.id.toString());
        formData.append('content', content);
        formData.append('message_type', messageType);
        formData.append('file', file);
        if (parentMessageId) {
          formData.append('parent_message_id', parentMessageId.toString());
        }

        const response = await fetch(`${apiBaseUrl}/citadel_hub/sendMessage`, {
          method: 'POST',
          body: formData,
        });
        await response.json();
      } else {
        sendWebSocketMessage('send_message', {
          room_id: selectedChatRoom.id,
          content,
          message_type: messageType,
          parent_message_id: parentMessageId,
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const createDirectChat = async (employeeId: string) => {
    try {
      const result = await apiCall('createDirectChat', { employee_id: employeeId });
      if (result.chat_room) {
        loadChatRooms();
        setSelectedChatRoom(result.chat_room);
        setViewMode('chat');
      }
    } catch (error) {
      console.error('Error creating direct chat:', error);
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
        loadChatRooms();
        setSelectedChatRoom(result.chat_room);
        setViewMode('chat');
      }
    } catch (error) {
      console.error('Error creating group chat:', error);
    }
  };

  const muteChat = async (roomId: number) => {
    try {
      await apiCall('muteChat', { chat_room_id: roomId });
      loadChatRooms();
    } catch (error) {
      console.error('Error muting chat:', error);
    }
  };

  const unmuteChat = async (roomId: number) => {
    try {
      await apiCall('unmuteChat', { chat_room_id: roomId });
      loadChatRooms();
    } catch (error) {
      console.error('Error unmuting chat:', error);
    }
  };

  const pinChat = (roomId: number) => {
    setChatRooms(prev => prev.map(room => {
      if (room.id === roomId) {
        return { ...room, is_pinned: true };
      }
      return room;
    }));
  };

  const unpinChat = (roomId: number) => {
    setChatRooms(prev => prev.map(room => {
      if (room.id === roomId) {
        return { ...room, is_pinned: false };
      }
      return room;
    }));
  };

  const markAsUnread = (roomId: number) => {
    setChatRooms(prev => prev.map(room => {
      if (room.id === roomId) {
        return { ...room, unread_count: (room.unread_count || 0) + 1 };
      }
      return room;
    }));
  };

  useEffect(() => {
    loadChatRooms();
    loadNotifications();
    connectWebSocket();

    return () => {
      if (ws.current) {
        ws.current.close();
      }
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
    };
  }, []);

  useEffect(() => {
    if (selectedChatRoom) {
      setMessagesPage(1);
      setHasMoreMessages(true);
      loadMessages(selectedChatRoom.id, 1);
      sendWebSocketMessage('join_room', { room_id: selectedChatRoom.id });
      sendWebSocketMessage('read_messages', { room_id: selectedChatRoom.id });
    }
  }, [selectedChatRoom]);

  const getFilteredChatRooms = () => {
    let filtered = chatRooms;

    if (searchQuery) {
      filtered = filtered.filter(room => {
        if (room.room_type === 'group') {
          return room.name?.toLowerCase().includes(searchQuery.toLowerCase());
        } else {
          const otherMember = room.members.find(m => {
            const member = m as ChatRoomMember;
            return member.user && member.user.employee_id !== currentUser.employee_id;
          });
          
          if (otherMember) {
            const member = otherMember as ChatRoomMember;
            if (member.user) {
              return `${member.user.first_name} ${member.user.last_name}`.toLowerCase().includes(searchQuery.toLowerCase());
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
      return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime();
    });
  };

  const handleChatSelect = (room: ChatRoom) => {
    setSelectedChatRoom(room);
    setViewMode('chat');
  };

  const loadMoreMessages = () => {
    if (selectedChatRoom && hasMoreMessages && !isLoadingMessages) {
      const nextPage = messagesPage + 1;
      setMessagesPage(nextPage);
      loadMessages(selectedChatRoom.id, nextPage);
    }
  };

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
              if (onBack) {
                onBack();
              }
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
          onReact={(messageId, emoji) => sendWebSocketMessage('react_message', { message_id: messageId, emoji })}
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
            await apiCall('updateGroupInfo', {
              chat_room_id: selectedChatRoom.id,
              name,
              description,
            });
            loadChatRooms();
            setViewMode('chatDetails');
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