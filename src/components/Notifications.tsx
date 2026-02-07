import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Animated,
  Dimensions, Platform, RefreshControl, Modal, Alert, LayoutAnimation, UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import * as ExpoNotifications from 'expo-notifications';
import { BACKEND_URL } from '../config/config';

ExpoNotifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width, height } = Dimensions.get('window');

const whatsappColors = {
  dark: {
    background: '#0B141A', card: '#1C2832', cardHover: '#202C33', text: '#E9EDEF',
    textSecondary: '#8696A0', textTertiary: '#667781', border: '#2A3942', primary: '#00A884',
    primaryDark: '#008069', header: '#1F2C34', icon: '#AEBAC1', danger: '#F15C6D',
    warning: '#F59E0B', success: '#00A884', unreadBg: '#182229', divider: '#233138',
    overlay: 'rgba(11, 20, 26, 0.95)', shadow: 'rgba(0, 0, 0, 0.3)',
  },
  light: {
    background: '#e7e6e5', card: '#FFFFFF', cardHover: '#F5F6F6', text: '#111B21',
    textSecondary: '#667781', textTertiary: '#8696A0', border: '#E9EDEF', primary: '#00A884',
    primaryDark: '#008069', header: '#008069', icon: '#54656F', danger: '#F15C6D',
    warning: '#F59E0B', success: '#00A884', unreadBg: '#F7F8FA', divider: '#E9EDEF',
    overlay: 'rgba(0, 0, 0, 0.6)', shadow: 'rgba(0, 0, 0, 0.08)',
  }
};

interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'reminder' | 'attendance' | 'hr' | 'cab' | 'leave' | 'system';
  Read: boolean;
  icon: string;
  category: 'today' | 'week' | 'earlier';
  page?: string;
  created_at?: string;
}

interface NotificationsProps {
  onBack: () => void;
  isDark?: boolean;
  onBadgeUpdate?: (count: number) => void;
}

const Notifications: React.FC<NotificationsProps> = ({ onBack, isDark = false, onBadgeUpdate }) => {
  const insets = useSafeAreaInsets();
  const currentColors = isDark ? whatsappColors.dark : whatsappColors.light;
  const scrollViewRef = useRef<ScrollView>(null);
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [showDisabledMessage, setShowDisabledMessage] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Track if we need to save read status (to prevent constant saves)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedNotificationsRef = useRef<Notification[]>([]);
  const previousUnreadCountRef = useRef(0); // FIX: Track previous count
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const modalAnim = useRef(new Animated.Value(height)).current;
  
  // FIX: Only load notifications once on mount
  const hasLoadedRef = useRef(false);

  // Load notification setting on mount
  useEffect(() => {
    loadNotificationSetting();
  }, []);

  const loadNotificationSetting = async () => {
    try {
      const storedSetting = await AsyncStorage.getItem('notifications_enabled');
      if (storedSetting !== null) {
        const enabled = storedSetting === 'true';
        setNotificationsEnabled(enabled);
        setShowDisabledMessage(!enabled);
        
        // Update notification handler based on setting
        if (Platform.OS !== 'web') {
          ExpoNotifications.setNotificationHandler({
            handleNotification: async () => ({
              shouldShowAlert: enabled,
              shouldPlaySound: enabled,
              shouldSetBadge: enabled,
              shouldShowBanner: enabled,
              shouldShowList: enabled,
            }),
          });
        }
        
        // If notifications are enabled, proceed with normal initialization
        if (enabled && !hasLoadedRef.current) {
          hasLoadedRef.current = true;
          requestNotificationPermissions();
          fetchNotifications();
        } else if (!enabled) {
          // If disabled, set loading to false but don't fetch notifications
          setLoading(false);
          // Clear any existing badge count
          updateIOSBadgeCount(0);
          if (onBadgeUpdate) onBadgeUpdate(0);
        }
      } else {
        // Default to enabled if not set
        if (!hasLoadedRef.current) {
          hasLoadedRef.current = true;
          setNotificationsEnabled(true);
          setShowDisabledMessage(false);
          requestNotificationPermissions();
          fetchNotifications();
        }
      }
    } catch (error) {
      console.error('Error loading notification setting:', error);
      // Default to enabled on error
      if (!hasLoadedRef.current) {
        hasLoadedRef.current = true;
        setNotificationsEnabled(true);
        requestNotificationPermissions();
        fetchNotifications();
      }
    }
    
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  };

  const updateIOSBadgeCount = async (count: number) => {
    if (Platform.OS === 'ios' && notificationsEnabled) {
      try {
        await ExpoNotifications.setBadgeCountAsync(count);
        console.log(`✅ iOS badge count updated to: ${count}`);
        if (count === 0) {
          await ExpoNotifications.dismissAllNotificationsAsync();
          console.log('✅ Cleared all notifications from tray');
        }
      } catch (error) {
        console.error('❌ Error updating iOS badge count:', error);
      }
    } else if (Platform.OS === 'ios' && !notificationsEnabled) {
      // Clear badge if notifications are disabled
      try {
        await ExpoNotifications.setBadgeCountAsync(0);
        await ExpoNotifications.dismissAllNotificationsAsync();
      } catch (error) {
        console.error('Error clearing iOS badge:', error);
      }
    }
  };

  const requestNotificationPermissions = async () => {
    if (Platform.OS === 'ios' && notificationsEnabled) {
      try {
        const { status } = await ExpoNotifications.requestPermissionsAsync({
          ios: { allowAlert: true, allowBadge: true, allowSound: true },
        });
        if (status !== 'granted') {
          console.warn('⚠️ Notification permissions not granted');
        } else {
          console.log('✅ Notification permissions granted');
        }
      } catch (error) {
        console.error('❌ Error requesting notification permissions:', error);
      }
    }
  };

  // FIX: Optimized badge update - only call parent when count actually changes
  useEffect(() => {
    if (!notificationsEnabled || notifications.length === 0) {
      // Update badge to 0 if notifications are disabled or empty
      const currentUnreadCount = 0;
      if (previousUnreadCountRef.current !== currentUnreadCount && onBadgeUpdate) {
        onBadgeUpdate(currentUnreadCount);
        previousUnreadCountRef.current = currentUnreadCount;
      }
      updateIOSBadgeCount(0);
      return;
    }

    const currentUnreadCount = notifications.filter(n => !n.Read).length;
    
    // Only call onBadgeUpdate if count actually changed
    if (previousUnreadCountRef.current !== currentUnreadCount && onBadgeUpdate) {
      onBadgeUpdate(currentUnreadCount);
      previousUnreadCountRef.current = currentUnreadCount;
    }
    
    updateIOSBadgeCount(currentUnreadCount);
    console.log(`📱 Total: ${notifications.length}, Unread: ${currentUnreadCount}`);

    // Debounce save operation to prevent constant writes
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      // Only save if read status actually changed
      const currentReadStatus = notifications.map(n => ({ id: n.id, read: n.Read }));
      const lastReadStatus = lastSavedNotificationsRef.current.map(n => ({ id: n.id, read: n.Read }));
      
      const hasChanged = JSON.stringify(currentReadStatus) !== JSON.stringify(lastReadStatus);
      if (hasChanged) {
        saveReadStatusLocally();
        lastSavedNotificationsRef.current = [...notifications];
      }
    }, 300); // Wait 300ms after change before saving

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [notifications, notificationsEnabled, onBadgeUpdate]);

  const saveReadStatusLocally = async () => {
    try {
      const readStatusMap: { [key: string]: boolean } = {};
      notifications.forEach(notif => {
        readStatusMap[notif.id] = notif.Read;
      });
      await AsyncStorage.setItem('notification_read_status', JSON.stringify(readStatusMap));
    } catch (error) {
      console.error('❌ Error saving read status locally:', error);
    }
  };

  const loadLocalReadStatus = async () => {
    try {
      const savedStatus = await AsyncStorage.getItem('notification_read_status');
      if (savedStatus) return JSON.parse(savedStatus);
    } catch (error) {
      console.error('❌ Error loading local read status:', error);
    }
    return {};
  };

  const saveDeletedIds = async (ids: Set<string>) => {
    try {
      await AsyncStorage.setItem('deleted_notification_ids', JSON.stringify([...ids]));
    } catch (error) {
      console.error('❌ Error saving deleted IDs:', error);
    }
  };

  const loadDeletedIds = async () => {
    try {
      const saved = await AsyncStorage.getItem('deleted_notification_ids');
      if (saved) {
        const ids = JSON.parse(saved);
        return new Set<string>(ids);
      }
    } catch (error) {
      console.error('❌ Error loading deleted IDs:', error);
    }
    return new Set<string>();
  };

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('token_2');
      if (!token) {
        console.error('❌ No authentication token found');
        setLoading(false);
        return;
      }

      const response = await fetch(`${BACKEND_URL}/core/getNotifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`📥 Fetched ${data.notifications?.length || 0} notifications from backend`);
        
        const localReadStatus = await loadLocalReadStatus();
        const localDeletedIds = await loadDeletedIds();
        
        if (data.notifications && data.notifications.length > 0) {
          console.log('📝 Sample notification from backend:', {
            id: data.notifications[0].id,
            title: data.notifications[0].title,
            Read: data.notifications[0].Read,
          });
        }
        
        const formattedNotifications = data.notifications
          .filter((notif: any) => !localDeletedIds.has(notif.id.toString()))
          .map((notif: any) => {
            const formatted = formatNotification(notif);
            if (!formatted.Read && localReadStatus[formatted.id] === true) {
              console.log(`✅ Notification ${formatted.id} marked as read from local storage`);
              return { ...formatted, Read: true };
            }
            return formatted;
          });
        
        formattedNotifications.sort((a: Notification, b: Notification) => {
          if (a.Read !== b.Read) return a.Read ? 1 : -1;
          if (a.created_at && b.created_at) {
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          }
          return 0;
        });
        
        setNotifications(formattedNotifications);
        lastSavedNotificationsRef.current = [...formattedNotifications];
        setDeletedIds(localDeletedIds);
        
        console.log(`📊 Final - Total: ${formattedNotifications.length}, Unread: ${formattedNotifications.filter((n: Notification) => !n.Read).length}`);
      } else {
        console.error(`❌ Failed to fetch notifications, status: ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatNotification = (notif: any): Notification => {
    const now = new Date();
    const createdAt = new Date(notif.created_at);
    const diffMs = now.getTime() - createdAt.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    let timeText = '';
    let category: 'today' | 'week' | 'earlier' = 'earlier';

    if (diffMins < 1) {
      timeText = 'Just now';
      category = 'today';
    } else if (diffMins < 60) {
      timeText = `${diffMins}m`;
      category = 'today';
    } else if (diffHours < 24) {
      timeText = `${diffHours}h`;
      category = 'today';
    } else if (diffDays === 1) {
      timeText = 'Yesterday';
      category = 'week';
    } else if (diffDays < 7) {
      timeText = `${diffDays}d`;
      category = 'week';
    } else {
      timeText = createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      category = 'earlier';
    }

    const isRead = Boolean(notif.Read || notif.is_read || notif.read || notif.isRead || false);

    return {
      id: notif.id.toString(),
      title: notif.title,
      message: notif.body,
      time: timeText,
      type: notif.type || 'info',
      Read: isRead,
      icon: getIconForType(notif.type),
      category,
      page: notif.page,
      created_at: notif.created_at,
    };
  };

  const getIconForType = (type: string): string => {
    const iconMap: { [key: string]: string } = {
      attendance: 'checkmark-circle', hr: 'people', cab: 'car', leave: 'calendar',
      reminder: 'time', success: 'checkmark-circle', warning: 'warning',
      error: 'alert-circle', info: 'information-circle', system: 'settings',
    };
    return iconMap[type] || 'notifications';
  };

  const getNotificationColor = (type: string) => {
    const colorMap: { [key: string]: string } = {
      attendance: '#00A884', hr: '#8B5CF6', cab: '#F59E0B', leave: '#3B82F6',
      reminder: '#A855F7', success: '#10B981', warning: '#F59E0B', error: '#EF4444',
      info: '#3B82F6', system: '#6B7280',
    };
    return colorMap[type] || currentColors.primary;
  };

  const handleMarkAsRead = async (id: string) => {
    if (!notificationsEnabled) return;
    
    try {
      const token = await AsyncStorage.getItem('token_2');
      if (!token) return;

      // Update UI optimistically
      setNotifications(prev => prev.map(notif => notif.id === id ? { ...notif, Read: true } : notif));

      const response = await fetch(`${BACKEND_URL}/core/markNotificationAsRead`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, notification_id: id }),
      });

      if (!response.ok) {
        console.error('❌ Failed to mark notification as read on backend');
        // Only revert if backend fails
        setNotifications(prev => prev.map(notif => notif.id === id ? { ...notif, Read: false } : notif));
      } else {
        console.log(`✅ Notification ${id} marked as read`);
      }
    } catch (error) {
      console.error('❌ Error marking notification as read:', error);
      setNotifications(prev => prev.map(notif => notif.id === id ? { ...notif, Read: false } : notif));
    }
  };

  const markAllNotificationsAsRead = async () => {
    if (!notificationsEnabled) return;
    
    const unreadNotifications = notifications.filter(n => !n.Read);
    if (unreadNotifications.length === 0) {
      console.log('✅ No unread notifications to mark');
      return;
    }

    try {
      const token = await AsyncStorage.getItem('token_2');
      if (!token) return;

      const originalNotifications = [...notifications];

      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setNotifications(prev => prev.map(notif => ({ ...notif, Read: true })));
      await updateIOSBadgeCount(0);

      const response = await fetch(`${BACKEND_URL}/core/markAllRead`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        console.error('❌ Failed to mark all as read on backend');
        setNotifications(originalNotifications);
      } else {
        console.log(`✅ Marked all ${unreadNotifications.length} notifications as read`);
      }
    } catch (error) {
      console.error('❌ Error marking all notifications as read:', error);
      // Don't reload, just show error
      Alert.alert('Error', 'Failed to mark all as read. Please try again.');
    }
  };

  const handleDelete = async (id: string) => {
    if (deletingIds.has(id)) return;

    setDeletingIds(prev => new Set(prev).add(id));

    try {
      const token = await AsyncStorage.getItem('token_2');
      if (!token) {
        setDeletingIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(id);
          return newSet;
        });
        return;
      }

      // Optimistically update UI first
      const newDeletedIds = new Set(deletedIds).add(id);
      setDeletedIds(newDeletedIds);
      await saveDeletedIds(newDeletedIds);
      
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setNotifications(prev => prev.filter(notif => notif.id !== id));

      const response = await fetch(`${BACKEND_URL}/core/deleteNotification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, notification_id: id }),
      });

      if (response.ok) {
        console.log(`✅ Notification ${id} deleted successfully`);
      } else {
        console.error('❌ Failed to delete notification on backend');
        Alert.alert('Error', 'Failed to delete notification on server. It may reappear on refresh.');
      }
    } catch (error) {
      console.error('❌ Error deleting notification:', error);
      Alert.alert('Error', 'Failed to delete notification. Please try again.');
    } finally {
      setDeletingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;

    Alert.alert(
      'Delete Notifications',
      `Are you sure you want to delete ${selectedIds.size} notification${selectedIds.size > 1 ? 's' : ''}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const idsToDelete = Array.from(selectedIds);
            
            try {
              const token = await AsyncStorage.getItem('token_2');
              if (!token) return;

              // Optimistically update UI first
              const newDeletedIds = new Set(deletedIds);
              idsToDelete.forEach(id => newDeletedIds.add(id));
              setDeletedIds(newDeletedIds);
              await saveDeletedIds(newDeletedIds);
              
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setNotifications(prev => prev.filter(notif => !selectedIds.has(notif.id)));
              setSelectedIds(new Set());
              setSelectionMode(false);

              // Delete on backend in background
              for (const id of idsToDelete) {
                const response = await fetch(`${BACKEND_URL}/core/deleteNotification`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ token, notification_id: id }),
                });

                if (response.ok) {
                  console.log(`✅ Notification ${id} deleted successfully`);
                } else {
                  console.error(`❌ Failed to delete notification ${id} on backend`);
                }
              }
              
            } catch (error) {
              console.error('❌ Error deleting selected notifications:', error);
              Alert.alert('Error', 'Some notifications may not have been deleted on the server.');
            }
          }
        }
      ]
    );
  };

  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    setSelectedIds(new Set());
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === notifications.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(notifications.map(n => n.id)));
    }
  };

  const toggleSelectItem = (id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const onRefresh = async () => {
    if (!notificationsEnabled) {
      setRefreshing(false);
      return;
    }
    
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  };

  const handleNotificationPress = (notification: Notification) => {
    if (!notificationsEnabled) return;
    
    if (selectionMode) {
      toggleSelectItem(notification.id);
      return;
    }
    
    if (!notification.Read) {
      handleMarkAsRead(notification.id);
    }

    setSelectedNotification(notification);
    setModalVisible(true);

    Animated.spring(modalAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
  };

  const handleNotificationLongPress = (notification: Notification) => {
    if (!notificationsEnabled) return;
    
    // Enable selection mode and select the item
    if (!selectionMode) {
      setSelectionMode(true);
    }
    toggleSelectItem(notification.id);
  };

  const closeModal = () => {
    Animated.timing(modalAnim, {
      toValue: height,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setModalVisible(false);
      setSelectedNotification(null);
      modalAnim.setValue(height);
    });
  };

  const NotificationItem = ({ notification, index }: { notification: Notification; index: number }) => {
    const itemOpacity = useRef(new Animated.Value(0)).current;
    const itemScale = useRef(new Animated.Value(0.95)).current;
    const notificationColor = getNotificationColor(notification.type);
    const [isDeleting, setIsDeleting] = useState(false);
    const isSelected = selectedIds.has(notification.id);
    
    useEffect(() => {
      Animated.parallel([
        Animated.timing(itemOpacity, {
          toValue: 1,
          duration: 300,
          delay: index * 50,
          useNativeDriver: true,
        }),
        Animated.spring(itemScale, {
          toValue: 1,
          delay: index * 50,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        })
      ]).start();
    }, []);

    const onDeletePress = () => {
      setIsDeleting(true);
      Animated.parallel([
        Animated.timing(itemOpacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(itemScale, {
          toValue: 0.95,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(() => {
        handleDelete(notification.id);
      });
    };

    return (
      <Animated.View style={[s.notifContainer, { opacity: itemOpacity, transform: [{ scale: itemScale }] }]}>
        <View style={[s.notifCard, { 
          backgroundColor: notification.Read ? currentColors.card : currentColors.unreadBg,
          opacity: notificationsEnabled ? 1 : 0.6 
        }]}>
          <TouchableOpacity
            style={s.notifContent}
            onPress={() => !isDeleting && handleNotificationPress(notification)}
            onLongPress={() => !isDeleting && handleNotificationLongPress(notification)}
            activeOpacity={0.6}
            delayPressIn={50}
            delayLongPress={500}
            disabled={isDeleting || !notificationsEnabled}
          >
            {selectionMode && (
              <TouchableOpacity 
                style={s.checkboxContainer}
                onPress={() => toggleSelectItem(notification.id)}
                activeOpacity={0.6}
              >
                <View style={[
                  s.checkbox,
                  { 
                    borderColor: isSelected ? currentColors.primary : currentColors.border,
                    backgroundColor: isSelected ? currentColors.primary : 'transparent',
                  }
                ]}>
                  {isSelected && (
                    <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                  )}
                </View>
              </TouchableOpacity>
            )}

            <View style={[s.iconBox, { 
              backgroundColor: selectionMode ? currentColors.primary : `${notificationColor}20` 
            }]}>
              <Ionicons 
                name={notification.icon as any} 
                size={22} 
                color={selectionMode ? "#FFFFFF" : notificationColor} 
              />
            </View>

            <View style={s.notifText}>
              <View style={s.titleRow}>
                <Text style={[s.title, { 
                  color: currentColors.text, 
                  fontWeight: notification.Read ? '400' : '600' 
                }]} numberOfLines={1}>
                  {notification.title}
                </Text>
                <Text style={[s.time, { color: currentColors.textTertiary, fontWeight: notification.Read ? '400' : '500' }]}>
                  {notification.time}
                </Text>
              </View>
              <Text style={[s.msg, { color: notification.Read ? currentColors.textSecondary : currentColors.text }]} numberOfLines={2}>
                {notification.message}
              </Text>
              {!notificationsEnabled && (
                <Text style={[s.disabledText, { color: currentColors.textTertiary }]}>
                  Notifications are disabled in settings
                </Text>
              )}
            </View>

            {!selectionMode && (
              <TouchableOpacity style={s.delBtn} onPress={onDeletePress} disabled={isDeleting} activeOpacity={0.6}>
                <Ionicons name="trash-outline" size={20} color={currentColors.textTertiary} />
              </TouchableOpacity>
            )}

            {!notification.Read && notificationsEnabled && !selectionMode && (
              <View style={s.unreadBox}>
                <View style={[s.dot, { backgroundColor: currentColors.primary }]} />
              </View>
            )}
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  };

  const SectionHeader = ({ title, count }: { title: string; count: number }) => (
    count > 0 ? (
      <View style={s.sectionHdr}>
        <Text style={[s.sectionTitle, { color: currentColors.textSecondary }]}>{title}</Text>
      </View>
    ) : null
  );

  const groupedNotifications = {
    today: notifications.filter(n => n.category === 'today'),
    week: notifications.filter(n => n.category === 'week'),
    earlier: notifications.filter(n => n.category === 'earlier'),
  };

  const unreadCount = notifications.filter(n => !n.Read).length;

  return (
    <View style={[s.container, { backgroundColor: currentColors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={currentColors.header} />
      
      <View style={[s.header, { 
        backgroundColor: currentColors.header,
        paddingTop: Platform.OS === 'ios' ? insets.top : StatusBar.currentHeight || 0,
        borderBottomWidth: 1,
        borderBottomColor: currentColors.border,
      }]}>
        <View style={s.hdrContent}>
          <TouchableOpacity style={s.backBtn} onPress={onBack} activeOpacity={0.6}>
            <View style={s.backBtnContent}>
              <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
              <Text style={[s.backBtnText, { color: "#FFFFFF" }]}>Back</Text>
            </View>
          </TouchableOpacity>
          
          <View style={[s.hdrTitleBox, selectionMode && { left: 90, right: 140 }]}>
            <Text style={[s.hdrTitle, { color: "#FFFFFF" }]} numberOfLines={1}>
              {selectionMode ? `${selectedIds.size} Selected` : 'Notifications'}
            </Text>
          </View>
          
          {selectionMode ? (
            <View style={s.selectionActions}>
              <TouchableOpacity 
                style={s.selectAllBtn}
                onPress={toggleSelectAll}
                activeOpacity={0.6}
              >
                <Text style={[s.selectAllText, { color: "#FFFFFF" }]}>
                  {selectedIds.size === notifications.length ? 'Deselect' : 'Select All'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[s.deleteSelectedBtn, { opacity: selectedIds.size === 0 ? 0.4 : 1 }]}
                onPress={handleDeleteSelected}
                disabled={selectedIds.size === 0}
                activeOpacity={0.6}
              >
                <Ionicons name="trash" size={22} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity 
                style={s.cancelBtn}
                onPress={toggleSelectionMode}
                activeOpacity={0.6}
              >
                <Ionicons name="close" size={26} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={s.normalActions}>
              <TouchableOpacity 
                style={[s.selectionModeBtn, { 
                  opacity: notifications.length === 0 || !notificationsEnabled ? 0.4 : 1 
                }]}
                onPress={toggleSelectionMode}
                disabled={notifications.length === 0 || !notificationsEnabled}
                activeOpacity={0.6}
              >
                <Ionicons name="checkmark-circle-outline" size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity 
                style={[s.markAllBtn, { 
                  opacity: unreadCount === 0 || !notificationsEnabled ? 0.4 : 1 
                }]}
                onPress={markAllNotificationsAsRead}
                disabled={unreadCount === 0 || !notificationsEnabled}
                activeOpacity={0.6}
              >
                <Ionicons name="checkmark-done" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {notifications.length > 0 && (
          <View style={s.hdrStats}>
            <Text style={[s.hdrStatsText, { color: isDark ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.85)" }]}>
              {notificationsEnabled 
                ? (unreadCount > 0 ? `${unreadCount} new` : 'All caught up') 
                : 'Notifications disabled'}
              {' • '}{notifications.length} total
            </Text>
          </View>
        )}
      </View>
      
      <SafeAreaView style={s.safeArea} edges={['left', 'right', 'bottom']}>
        <ScrollView
          ref={scrollViewRef}
          style={s.scroll}
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          scrollEnabled={scrollEnabled}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={currentColors.primary}
              colors={[currentColors.primary]}
              progressBackgroundColor={currentColors.card}
              enabled={notificationsEnabled}
            />
          }
        >
          {showDisabledMessage ? (
            <Animated.View style={[s.empty, { opacity: fadeAnim }]}>
              <View style={[s.emptyIconBox, { 
                backgroundColor: currentColors.card,
                borderWidth: 2,
                borderColor: currentColors.warning + '30'
              }]}>
                <Ionicons name="notifications-off-outline" size={56} color={currentColors.warning} />
              </View>
              <Text style={[s.emptyTitle, { color: currentColors.text }]}>Notifications Disabled</Text>
              <Text style={[s.emptyMsg, { 
                color: currentColors.textSecondary,
                textAlign: 'center',
                marginHorizontal: 20
              }]}>
                Notifications are currently turned off in your settings.{'\n\n'}
                You can enable them in Settings → Notifications to receive alerts and updates.
              </Text>
              <TouchableOpacity 
                style={[s.enableButton, { 
                  backgroundColor: currentColors.primary,
                  marginTop: 20
                }]}
                onPress={onBack}
                activeOpacity={0.7}
              >
                <Text style={[s.enableButtonText, { color: '#FFFFFF' }]}>
                  Go to Settings
                </Text>
              </TouchableOpacity>
            </Animated.View>
          ) : loading ? (
            <View style={s.empty}>
              <Animated.View style={[s.loading, { opacity: fadeAnim }]}>
                <Ionicons name="notifications-outline" size={56} color={currentColors.textSecondary} />
                <Text style={[s.emptyMsg, { color: currentColors.textSecondary, marginTop: 16 }]}>
                  Loading notifications...
                </Text>
              </Animated.View>
            </View>
          ) : notifications.length === 0 ? (
            <Animated.View style={[s.empty, { opacity: fadeAnim }]}>
              <View style={[s.emptyIconBox, { backgroundColor: currentColors.card }]}>
                <Ionicons name="notifications-off-outline" size={56} color={currentColors.textSecondary} />
              </View>
              <Text style={[s.emptyTitle, { color: currentColors.text }]}>No notifications yet</Text>
              <Text style={[s.emptyMsg, { color: currentColors.textSecondary }]}>
                We'll notify you when something important happens
              </Text>
            </Animated.View>
          ) : (
            <Animated.View style={{ opacity: fadeAnim }}>
              {groupedNotifications.today.length > 0 && (
                <>
                  <SectionHeader title="NEW" count={groupedNotifications.today.length} />
                  {groupedNotifications.today.map((n, i) => <NotificationItem key={n.id} notification={n} index={i} />)}
                </>
              )}
              {groupedNotifications.week.length > 0 && (
                <>
                  <SectionHeader title="EARLIER" count={groupedNotifications.week.length} />
                  {groupedNotifications.week.map((n, i) => (
                    <NotificationItem key={n.id} notification={n} index={i + groupedNotifications.today.length} />
                  ))}
                </>
              )}
              {groupedNotifications.earlier.length > 0 && (
                <>
                  {groupedNotifications.week.length === 0 && groupedNotifications.today.length === 0 && (
                    <SectionHeader title="EARLIER" count={groupedNotifications.earlier.length} />
                  )}
                  {groupedNotifications.earlier.map((n, i) => (
                    <NotificationItem key={n.id} notification={n} 
                      index={i + groupedNotifications.today.length + groupedNotifications.week.length} />
                  ))}
                </>
              )}
            </Animated.View>
          )}
          <View style={s.bottomSpace} />
        </ScrollView>
      </SafeAreaView>

      <Modal animationType="none" transparent={true} visible={modalVisible} onRequestClose={closeModal} 
        statusBarTranslucent hardwareAccelerated>
        <View style={[s.modalOverlay, { backgroundColor: currentColors.overlay }]}>
          <TouchableOpacity style={s.modalOverlayTouch} activeOpacity={1} onPress={closeModal}>
            <Animated.View style={[s.modalBox, {
              backgroundColor: currentColors.background,
              transform: [{ translateY: modalAnim }],
            }]}>
              <TouchableOpacity activeOpacity={1}>
                <View style={s.modalDrag}>
                  <View style={[s.dragHandle, { backgroundColor: currentColors.textTertiary }]} />
                </View>

                {selectedNotification && (
                  <ScrollView style={s.modalContent} showsVerticalScrollIndicator={false} bounces={false}>
                    <View style={s.modalHdr}>
                      <View style={[s.modalIconBox, { 
                        backgroundColor: `${getNotificationColor(selectedNotification.type)}20` 
                      }]}>
                        <Ionicons name={selectedNotification.icon as any} size={32} 
                          color={getNotificationColor(selectedNotification.type)} />
                      </View>
                    </View>

                    <View style={s.modalTitleSec}>
                      <Text style={[s.modalTitle, { color: currentColors.text }]}>
                        {selectedNotification.title}
                      </Text>
                      
                      <View style={s.modalMetaRow}>
                        <View style={s.modalMetaItem}>
                          <Ionicons name="time-outline" size={14} color={currentColors.textSecondary} />
                          <Text style={[s.modalMetaText, { color: currentColors.textSecondary }]}>
                            {selectedNotification.time}
                          </Text>
                        </View>
                        
                        <View style={[s.typeBadge, { 
                          backgroundColor: `${getNotificationColor(selectedNotification.type)}15` 
                        }]}>
                          <Ionicons name={selectedNotification.icon as any} size={12} 
                            color={getNotificationColor(selectedNotification.type)} />
                          <Text style={[s.typeText, { 
                            color: getNotificationColor(selectedNotification.type) 
                          }]}>
                            {selectedNotification.type.toUpperCase()}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <View style={[s.modalDivider, { backgroundColor: currentColors.divider }]} />

                    <View style={[s.modalMsgCard, { 
                      backgroundColor: isDark ? currentColors.card : currentColors.unreadBg 
                    }]}>
                      <Text style={[s.modalMsg, { color: currentColors.text }]}>
                        {selectedNotification.message}
                      </Text>
                    </View>

                    {selectedNotification.created_at && (
                      <View style={s.modalInfoSec}>
                        <View style={s.modalInfoItem}>
                          <Ionicons name="calendar-outline" size={16} color={currentColors.textSecondary} />
                          <Text style={[s.modalInfoText, { color: currentColors.textSecondary }]}>
                            {new Date(selectedNotification.created_at).toLocaleString('en-US', {
                              month: 'short', day: 'numeric', year: 'numeric',
                              hour: '2-digit', minute: '2-digit',
                            })}
                          </Text>
                        </View>
                      </View>
                    )}

                    <View style={s.modalActions}>
                      {selectedNotification.page && (
                        <TouchableOpacity
                          style={[s.modalActionBtn, { backgroundColor: currentColors.primary }]}
                          onPress={closeModal}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                          <Text style={s.modalActionBtnText}>View Details</Text>
                        </TouchableOpacity>
                      )}
                      
                      <TouchableOpacity
                        style={[s.modalActionBtn2, { 
                          backgroundColor: isDark ? currentColors.card : currentColors.background,
                          borderWidth: 1.5, borderColor: currentColors.border,
                        }]}
                        onPress={closeModal}
                        activeOpacity={0.8}
                      >
                        <Text style={[s.modalActionBtn2Text, { color: currentColors.text }]}>Dismiss</Text>
                      </TouchableOpacity>
                    </View>

                    <View style={{ height: 32 }} />
                  </ScrollView>
                )}
              </TouchableOpacity>
            </Animated.View>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 12, elevation: 2, shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3 },
  hdrContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 12, paddingBottom: 4 },
  backBtn: { width: 85, height: 40, alignItems: 'flex-start', justifyContent: 'center', zIndex: 1 },
  backBtnContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start' },
  backBtnText: { fontSize: 16, fontWeight: '500', marginLeft: 4 },
  hdrTitleBox: { position: 'absolute', left: 0, right: 0, alignItems: 'center',
    justifyContent: 'center', zIndex: 0 },
  hdrTitle: { fontSize: 18, fontWeight: '600' },
  normalActions: { flexDirection: 'row', alignItems: 'center', gap: 8, zIndex: 1 },
  selectionModeBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  markAllBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  selectionActions: { flexDirection: 'row', alignItems: 'center', gap: 2, zIndex: 1 },
  selectAllBtn: { 
    paddingHorizontal: 8, 
    paddingVertical: 5, 
    borderRadius: 5, 
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  selectAllText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
  deleteSelectedBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  cancelBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  hdrStats: { marginTop: 4, marginBottom: 4, alignItems: 'center' },
  hdrStatsText: { fontSize: 13, fontWeight: '400' },
  scroll: { flex: 1 },
  scrollContent: { paddingTop: 8 },
  sectionHdr: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 12, marginTop: 8 },
  sectionTitle: { fontSize: 13, fontWeight: '600', letterSpacing: 0.5 },
  notifContainer: { position: 'relative', marginBottom: 1, height: 90 },
  notifCard: { position: 'relative', zIndex: 1 },
  notifContent: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14 },
  checkboxContainer: { marginRight: 10, justifyContent: 'center', alignItems: 'center' },
  checkbox: { 
    width: 22, 
    height: 22, 
    borderRadius: 11, 
    borderWidth: 2, 
    alignItems: 'center', 
    justifyContent: 'center',
  },
  delBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', marginLeft: 8, marginTop: 2 },
  iconBox: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
    marginRight: 14, marginTop: 2 },
  notifText: { flex: 1 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  title: { fontSize: 16, flex: 1, marginRight: 8, letterSpacing: 0.2 },
  time: { fontSize: 13, letterSpacing: 0.1 },
  msg: { fontSize: 14, lineHeight: 20, letterSpacing: 0.1 },
  disabledText: { fontSize: 11, marginTop: 4, fontStyle: 'italic' },
  unreadBox: { marginLeft: 8, justifyContent: 'flex-start', marginTop: 4 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80, paddingHorizontal: 40 },
  loading: { alignItems: 'center', justifyContent: 'center' },
  emptyIconBox: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  emptyTitle: { fontSize: 22, fontWeight: '600', marginBottom: 12, letterSpacing: 0.2 },
  emptyMsg: { fontSize: 15, textAlign: 'center', lineHeight: 22, letterSpacing: 0.1 },
  bottomSpace: { height: 40 },
  enableButton: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 20, marginTop: 20 },
  enableButtonText: { fontSize: 16, fontWeight: '600' },
  modalOverlay: { flex: 1 },
  modalOverlayTouch: { flex: 1, justifyContent: 'flex-end' },
  modalBox: { maxHeight: height * 0.75, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 24 },
  modalDrag: { alignItems: 'center', paddingVertical: 14 },
  dragHandle: { width: 40, height: 4, borderRadius: 2, opacity: 0.3 },
  modalContent: { paddingHorizontal: 24 },
  modalHdr: { alignItems: 'center', marginTop: 8, marginBottom: 20 },
  modalIconBox: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  modalTitleSec: { marginBottom: 20 },
  modalTitle: { fontSize: 24, fontWeight: '700', marginBottom: 14, letterSpacing: 0.3,
    textAlign: 'center', lineHeight: 32 },
  modalMetaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  modalMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  modalMetaText: { fontSize: 14, fontWeight: '500' },
  typeBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 8, gap: 6 },
  typeText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  modalDivider: { height: 1, marginVertical: 24 },
  modalMsgCard: { padding: 20, borderRadius: 16, marginBottom: 24 },
  modalMsg: { fontSize: 16, lineHeight: 26, letterSpacing: 0.3 },
  modalInfoSec: { marginBottom: 24 },
  modalInfoItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 8 },
  modalInfoText: { fontSize: 14, fontWeight: '500' },
  modalActions: { flexDirection: 'column', gap: 12 },
  modalActionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 14,
    paddingVertical: 16, paddingHorizontal: 24, gap: 10 },
  modalActionBtnText: { fontSize: 17, fontWeight: '600', color: '#FFFFFF', letterSpacing: 0.3 },
  modalActionBtn2: { alignItems: 'center', justifyContent: 'center', borderRadius: 14, paddingVertical: 16, paddingHorizontal: 24 },
  modalActionBtn2Text: { fontSize: 17, fontWeight: '600', letterSpacing: 0.3 },
});

export default Notifications;