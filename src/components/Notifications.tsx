import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Animated,
  Dimensions, Platform, RefreshControl, Modal, Alert, ActivityIndicator,
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

const { width, height } = Dimensions.get('window');

// ============================================================================
// DEBUG LOGGER
// ============================================================================
const DEBUG = true;
const log = {
  render: (component: string, props?: any) => {
    if (!DEBUG) return;
    console.log(`🎨 [RENDER] ${component}`, props || '');
  },
  state: (action: string, data?: any) => {
    if (!DEBUG) return;
    console.log(`📊 [STATE] ${action}`, data || '');
  },
  effect: (component: string, action: string, data?: any) => {
    if (!DEBUG) return;
    console.log(`⚡ [EFFECT] ${component} - ${action}`, data || '');
  },
  mount: (component: string, id?: string) => {
    if (!DEBUG) return;
    console.log(`🟢 [MOUNT] ${component}${id ? ` (${id})` : ''}`);
  },
  unmount: (component: string, id?: string) => {
    if (!DEBUG) return;
    console.log(`🔴 [UNMOUNT] ${component}${id ? ` (${id})` : ''}`);
  },
  animation: (component: string, action: string, data?: any) => {
    if (!DEBUG) return;
    console.log(`🎬 [ANIMATION] ${component} - ${action}`, data || '');
  },
  interaction: (action: string, data?: any) => {
    if (!DEBUG) return;
    console.log(`👆 [INTERACTION] ${action}`, data || '');
  },
  pagination: (action: string, data?: any) => {
    if (!DEBUG) return;
    console.log(`📄 [PAGINATION] ${action}`, data || '');
  },
};

const PAGE_SIZE = 50;
// How many pixels from the bottom of the ScrollView to trigger the next page load.
// Using 300px gives a comfortable buffer so the user never sees a hard stop.
const LOAD_MORE_THRESHOLD = 300;

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
  go_to?: string | null;
  created_at?: string;
}

interface PaginationState {
  currentPage: number;
  hasMore: boolean;
  totalCount: number;
  totalPages: number;
  isLoadingMore: boolean;
}

interface NotificationsProps {
  onBack: () => void;
  isDark?: boolean;
  onBadgeUpdate?: (count: number) => void;
  onNavigateToModule?: (moduleName: string, extraData?: any) => void;
}

// ============================================================================
// NOTIFICATION ITEM COMPONENT
// ============================================================================
const NotificationItem = React.memo(({
  notification,
  index,
  isSelected,
  onPress,
  onLongPress,
  onDelete,
  selectionMode,
  notificationColor,
  notificationsEnabled,
  currentColors,
}: {
  notification: Notification;
  index: number;
  isSelected: boolean;
  onPress: (notification: Notification) => void;
  onLongPress: (notification: Notification) => void;
  onDelete: (id: string) => void;
  selectionMode: boolean;
  notificationColor: string;
  notificationsEnabled: boolean;
  currentColors: typeof whatsappColors.dark;
}) => {
  const instanceIdRef = useRef(Math.random().toString(36).substr(2, 9));
  const renderCountRef = useRef(0);
  renderCountRef.current++;

  const itemOpacity = useRef(new Animated.Value(0)).current;
  const itemScale = useRef(new Animated.Value(0.95)).current;
  const [isDeleting, setIsDeleting] = useState(false);
  const hasMountedRef = useRef(false);

  useEffect(() => {
    log.mount(`NotificationItem-${notification.id}`, instanceIdRef.current);
    return () => {
      log.unmount(`NotificationItem-${notification.id}`, instanceIdRef.current);
    };
  }, [notification.id]);

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      // Cap delay so items deep in the list don't have enormous delays
      const delay = Math.min(index * 50, 400);
      Animated.parallel([
        Animated.timing(itemOpacity, {
          toValue: 1,
          duration: 300,
          delay,
          useNativeDriver: true,
        }),
        Animated.spring(itemScale, {
          toValue: 1,
          delay,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        })
      ]).start();
    }
  }, []);

  const handleDeletePress = useCallback(() => {
    log.interaction(`Delete item ${notification.id}`);
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
      onDelete(notification.id);
    });
  }, [notification.id, onDelete, itemOpacity, itemScale]);

  return (
    <Animated.View style={[s.notifContainer, { opacity: itemOpacity, transform: [{ scale: itemScale }] }]}>
      <View style={[s.notifCard, {
        backgroundColor: notification.Read ? currentColors.card : currentColors.unreadBg,
        opacity: notificationsEnabled ? 1 : 0.6
      }]}>
        <TouchableOpacity
          style={s.notifContent}
          onPress={() => onPress(notification)}
          onLongPress={() => onLongPress(notification)}
          activeOpacity={0.6}
          delayPressIn={50}
          delayLongPress={500}
          disabled={isDeleting || !notificationsEnabled}
        >
          {selectionMode && (
            <TouchableOpacity
              style={s.checkboxContainer}
              onPress={() => onPress(notification)}
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
            <TouchableOpacity style={s.delBtn} onPress={handleDeletePress} disabled={isDeleting} activeOpacity={0.6}>
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
}, (prevProps, nextProps) => {
  return (
    prevProps.notification.id === nextProps.notification.id &&
    prevProps.notification.Read === nextProps.notification.Read &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.selectionMode === nextProps.selectionMode &&
    prevProps.notificationsEnabled === nextProps.notificationsEnabled &&
    prevProps.notificationColor === nextProps.notificationColor
  );
});

// ============================================================================
// LOAD MORE FOOTER COMPONENT
// ============================================================================
const LoadMoreFooter = React.memo(({
  isLoadingMore,
  hasMore,
  currentColors,
}: {
  isLoadingMore: boolean;
  hasMore: boolean;
  currentColors: typeof whatsappColors.dark;
}) => {
  if (!hasMore && !isLoadingMore) return null;

  return (
    <View style={s.loadMoreFooter}>
      {isLoadingMore ? (
        <>
          <ActivityIndicator size="small" color={currentColors.primary} />
          <Text style={[s.loadMoreText, { color: currentColors.textSecondary }]}>
            Loading more notifications...
          </Text>
        </>
      ) : (
        // Spacer so the user knows there's more below (visible briefly before auto-load kicks in)
        <View style={s.loadMoreSpacer} />
      )}
    </View>
  );
});

// ============================================================================
// MAIN NOTIFICATIONS COMPONENT
// ============================================================================
const Notifications: React.FC<NotificationsProps> = ({
  onBack,
  isDark = false,
  onBadgeUpdate,
  onNavigateToModule
}) => {
  const insets = useSafeAreaInsets();
  const currentColors = useMemo(() => isDark ? whatsappColors.dark : whatsappColors.light, [isDark]);
  const scrollViewRef = useRef<ScrollView>(null);

  // Core state
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);

  // Pagination state — kept in a single object to avoid waterfall re-renders
  const [pagination, setPagination] = useState<PaginationState>({
    currentPage: 1,
    hasMore: false,
    totalCount: 0,
    totalPages: 1,
    isLoadingMore: false,
  });

  // UI state
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [showDisabledMessage, setShowDisabledMessage] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  // When user is in selection mode and taps "Select All", we need to know
  // whether ALL backend notifications are selected (not just the loaded ones).
  const [allSelected, setAllSelected] = useState(false);

  // Refs
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedNotificationsRef = useRef<Notification[]>([]);
  const previousUnreadCountRef = useRef(0);
  const hasLoadedRef = useRef(false);
  const isMountedRef = useRef(true);
  // Guard against concurrent "load more" calls
  const isLoadingMoreRef = useRef(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const modalAnim = useRef(new Animated.Value(height)).current;

  // ============================================================================
  // MOUNT / UNMOUNT
  // ============================================================================
  useEffect(() => {
    log.mount('Notifications (Parent)');
    isMountedRef.current = true;

    const initialize = async () => {
      await loadNotificationSetting();
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    };
    initialize();

    return () => {
      log.unmount('Notifications (Parent)');
      isMountedRef.current = false;
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  // ============================================================================
  // BADGE + SAVE SIDE-EFFECTS
  // ============================================================================
  useEffect(() => {
    if (!isMountedRef.current) return;

    if (!notificationsEnabled || notifications.length === 0) {
      if (previousUnreadCountRef.current !== 0 && onBadgeUpdate) {
        onBadgeUpdate(0);
        previousUnreadCountRef.current = 0;
      }
      updateIOSBadgeCount(0);
      return;
    }

    // Use totalCount from server for badge so it accounts for all pages
    const currentUnreadCount = notifications.filter(n => !n.Read).length;

    if (previousUnreadCountRef.current !== currentUnreadCount && onBadgeUpdate) {
      onBadgeUpdate(currentUnreadCount);
      previousUnreadCountRef.current = currentUnreadCount;
    }

    updateIOSBadgeCount(currentUnreadCount);

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      if (!isMountedRef.current) return;
      const currentReadStatus = notifications.map(n => ({ id: n.id, read: n.Read }));
      const lastReadStatus = lastSavedNotificationsRef.current.map(n => ({ id: n.id, read: n.Read }));
      if (JSON.stringify(currentReadStatus) !== JSON.stringify(lastReadStatus)) {
        saveReadStatusLocally();
        lastSavedNotificationsRef.current = [...notifications];
      }
    }, 300);
  }, [notifications, notificationsEnabled, onBadgeUpdate]);

  // ============================================================================
  // SETTINGS
  // ============================================================================
  const loadNotificationSetting = useCallback(async () => {
    try {
      const storedSetting = await AsyncStorage.getItem('notifications_enabled');
      const enabled = storedSetting !== null ? storedSetting === 'true' : true;
      if (!isMountedRef.current) return;

      setNotificationsEnabled(enabled);
      setShowDisabledMessage(!enabled);

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

      if (enabled && !hasLoadedRef.current) {
        hasLoadedRef.current = true;
        await requestNotificationPermissions();
        await fetchNotifications(1, false);
      } else if (!enabled) {
        setLoading(false);
        await updateIOSBadgeCount(0);
        if (onBadgeUpdate) onBadgeUpdate(0);
      }
    } catch (error) {
      console.error('❌ Error loading notification setting:', error);
      if (!hasLoadedRef.current && isMountedRef.current) {
        hasLoadedRef.current = true;
        setNotificationsEnabled(true);
        await requestNotificationPermissions();
        await fetchNotifications(1, false);
      }
    }
  }, [onBadgeUpdate]);

  const requestNotificationPermissions = useCallback(async () => {
    if (Platform.OS === 'ios') {
      try {
        const { status } = await ExpoNotifications.requestPermissionsAsync({
          ios: { allowAlert: true, allowBadge: true, allowSound: true },
        });
        if (status !== 'granted') console.warn('⚠️ Notification permissions not granted');
      } catch (error) {
        console.error('❌ Error requesting notification permissions:', error);
      }
    }
  }, []);

  const updateIOSBadgeCount = useCallback(async (count: number) => {
    if (Platform.OS !== 'ios') return;
    try {
      await ExpoNotifications.setBadgeCountAsync(notificationsEnabled ? count : 0);
      if (count === 0 || !notificationsEnabled) {
        await ExpoNotifications.dismissAllNotificationsAsync();
      }
    } catch (error) {
      console.error('❌ Error updating iOS badge count:', error);
    }
  }, [notificationsEnabled]);

  // ============================================================================
  // LOCAL PERSISTENCE HELPERS
  // ============================================================================
  const saveReadStatusLocally = useCallback(async () => {
    try {
      const readStatusMap: { [key: string]: boolean } = {};
      notifications.forEach(notif => { readStatusMap[notif.id] = notif.Read; });
      await AsyncStorage.setItem('notification_read_status', JSON.stringify(readStatusMap));
    } catch (error) {
      console.error('❌ Error saving read status locally:', error);
    }
  }, [notifications]);

  const loadLocalReadStatus = useCallback(async () => {
    try {
      const savedStatus = await AsyncStorage.getItem('notification_read_status');
      if (savedStatus) return JSON.parse(savedStatus);
    } catch (error) {
      console.error('❌ Error loading local read status:', error);
    }
    return {};
  }, []);

  const saveDeletedIds = useCallback(async (ids: Set<string>) => {
    try {
      await AsyncStorage.setItem('deleted_notification_ids', JSON.stringify([...ids]));
    } catch (error) {
      console.error('❌ Error saving deleted IDs:', error);
    }
  }, []);

  const loadDeletedIds = useCallback(async () => {
    try {
      const saved = await AsyncStorage.getItem('deleted_notification_ids');
      if (saved) return new Set<string>(JSON.parse(saved));
    } catch (error) {
      console.error('❌ Error loading deleted IDs:', error);
    }
    return new Set<string>();
  }, []);

  // ============================================================================
  // FETCH — supports both initial load and incremental page loads
  // ============================================================================
  /**
   * @param page          Page number to fetch (1-indexed)
   * @param append        If true, append results to existing list (pagination).
   *                      If false, replace list (initial load / pull-to-refresh).
   */
  const fetchNotifications = useCallback(async (page: number = 1, append: boolean = false) => {
    // Prevent duplicate in-flight requests
    if (append && isLoadingMoreRef.current) {
      log.pagination('Skipping duplicate load-more request');
      return;
    }

    log.pagination('Fetching notifications', { page, append });

    try {
      if (append) {
        isLoadingMoreRef.current = true;
        setPagination(prev => ({ ...prev, isLoadingMore: true }));
      } else {
        setLoading(true);
      }

      const token = await AsyncStorage.getItem('token_2');
      if (!token) {
        console.error('❌ No authentication token found');
        return;
      }

      const response = await fetch(`${BACKEND_URL}/core/getNotifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, page, page_size: PAGE_SIZE }),
      });

      if (!isMountedRef.current) return;

      if (response.ok) {
        const data = await response.json();
        log.pagination('Response received', {
          page: data.page,
          total: data.total_count,
          has_next: data.has_next,
          received: data.notifications?.length || 0,
        });

        const localReadStatus = await loadLocalReadStatus();
        const localDeletedIds = await loadDeletedIds();

        const formatted: Notification[] = data.notifications
          .filter((notif: any) => !localDeletedIds.has(notif.id.toString()))
          .map((notif: any) => {
            const f = formatNotification(notif);
            // Merge any locally-cached read status
            if (!f.Read && localReadStatus[f.id] === true) {
              return { ...f, Read: true };
            }
            return f;
          });

        // Sort: unread first, then newest
        formatted.sort((a, b) => {
          if (a.Read !== b.Read) return a.Read ? 1 : -1;
          if (a.created_at && b.created_at) {
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          }
          return 0;
        });

        if (!isMountedRef.current) return;

        if (append) {
          // Deduplicate by id in case backend returns overlapping items
          setNotifications(prev => {
            const existingIds = new Set(prev.map(n => n.id));
            const newItems = formatted.filter(n => !existingIds.has(n.id));
            return [...prev, ...newItems];
          });
        } else {
          setNotifications(formatted);
          lastSavedNotificationsRef.current = [...formatted];
          setDeletedIds(localDeletedIds);
        }

        setPagination({
          currentPage: data.page,
          hasMore: data.has_next,
          totalCount: data.total_count,
          totalPages: data.total_pages,
          isLoadingMore: false,
        });
      } else {
        console.error(`❌ Failed to fetch notifications, status: ${response.status}`);
        if (isMountedRef.current) {
          setPagination(prev => ({ ...prev, isLoadingMore: false }));
        }
      }
    } catch (error) {
      console.error('❌ Error fetching notifications:', error);
      if (isMountedRef.current) {
        setPagination(prev => ({ ...prev, isLoadingMore: false }));
      }
    } finally {
      isLoadingMoreRef.current = false;
      if (isMountedRef.current) {
        setLoading(false);
        if (!append) setRefreshing(false);
      }
    }
  }, [loadLocalReadStatus, loadDeletedIds]);

  // ============================================================================
  // SCROLL HANDLER — triggers pagination when user nears the bottom
  // ============================================================================
  const handleScroll = useCallback((event: any) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const distanceFromBottom = contentSize.height - contentOffset.y - layoutMeasurement.height;

    if (
      distanceFromBottom < LOAD_MORE_THRESHOLD &&
      pagination.hasMore &&
      !pagination.isLoadingMore &&
      !isLoadingMoreRef.current &&
      !loading
    ) {
      log.pagination('Threshold reached, loading next page', {
        distanceFromBottom,
        nextPage: pagination.currentPage + 1,
      });
      fetchNotifications(pagination.currentPage + 1, true);
    }
  }, [pagination.hasMore, pagination.isLoadingMore, pagination.currentPage, loading, fetchNotifications]);

  // ============================================================================
  // FORMAT HELPERS
  // ============================================================================
  const formatNotification = useCallback((notif: any): Notification => {
    const now = new Date();
    const createdAt = new Date(notif.created_at);
    const diffMs = now.getTime() - createdAt.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    let timeText = '';
    let category: 'today' | 'week' | 'earlier' = 'earlier';

    if (diffMins < 1) { timeText = 'Just now'; category = 'today'; }
    else if (diffMins < 60) { timeText = `${diffMins}m`; category = 'today'; }
    else if (diffHours < 24) { timeText = `${diffHours}h`; category = 'today'; }
    else if (diffDays === 1) { timeText = 'Yesterday'; category = 'week'; }
    else if (diffDays < 7) { timeText = `${diffDays}d`; category = 'week'; }
    else {
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
      go_to: notif.go_to || null,
      created_at: notif.created_at,
    };
  }, []);

  const getIconForType = useCallback((type: string): string => {
    const iconMap: { [key: string]: string } = {
      attendance: 'checkmark-circle', hr: 'people', cab: 'car', leave: 'calendar',
      reminder: 'time', success: 'checkmark-circle', warning: 'warning',
      error: 'alert-circle', info: 'information-circle', system: 'settings',
    };
    return iconMap[type] || 'notifications';
  }, []);

  const getNotificationColor = useCallback((type: string) => {
    const colorMap: { [key: string]: string } = {
      attendance: '#00A884', hr: '#8B5CF6', cab: '#F59E0B', leave: '#3B82F6',
      reminder: '#A855F7', success: '#10B981', warning: '#F59E0B', error: '#EF4444',
      info: '#3B82F6', system: '#6B7280',
    };
    return colorMap[type] || currentColors.primary;
  }, [currentColors.primary]);

  // ============================================================================
  // MARK AS READ
  // ============================================================================
  const handleMarkAsRead = useCallback(async (id: string) => {
    if (!notificationsEnabled) return;
    try {
      const token = await AsyncStorage.getItem('token_2');
      if (!token) return;

      setNotifications(prev => prev.map(n => n.id === id ? { ...n, Read: true } : n));

      const response = await fetch(`${BACKEND_URL}/core/markNotificationAsRead`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, notification_id: id }),
      });

      if (!response.ok && isMountedRef.current) {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, Read: false } : n));
      }
    } catch (error) {
      console.error('❌ Error marking notification as read:', error);
      if (isMountedRef.current) {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, Read: false } : n));
      }
    }
  }, [notificationsEnabled]);

  /**
   * Mark ALL read — backend marks ALL notifications for the user (regardless of
   * pagination), then we update local state to reflect the change.
   */
  const markAllNotificationsAsRead = useCallback(async () => {
    if (!notificationsEnabled) return;
    const unreadCount = notifications.filter(n => !n.Read).length;
    // Even if unreadCount === 0 locally, there may be unread on unloaded pages.
    // We still proceed but skip if we're confident there's nothing to do.
    if (unreadCount === 0 && pagination.currentPage >= pagination.totalPages) return;

    try {
      const token = await AsyncStorage.getItem('token_2');
      if (!token) return;

      // Optimistically update all loaded notifications
      setNotifications(prev => prev.map(n => ({ ...n, Read: true })));
      await updateIOSBadgeCount(0);

      const response = await fetch(`${BACKEND_URL}/core/markAllRead`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      if (!response.ok && isMountedRef.current) {
        console.error('❌ Failed to mark all as read on backend — reverting');
        // Re-fetch to restore correct state
        await fetchNotifications(1, false);
      }
    } catch (error) {
      console.error('❌ Error marking all notifications as read:', error);
      Alert.alert('Error', 'Failed to mark all as read. Please try again.');
    }
  }, [notificationsEnabled, notifications, pagination, updateIOSBadgeCount, fetchNotifications]);

  // ============================================================================
  // DELETE — single item
  // ============================================================================
  const handleDelete = useCallback(async (id: string) => {
    if (deletingIds.has(id)) return;
    setDeletingIds(prev => new Set(prev).add(id));

    try {
      const token = await AsyncStorage.getItem('token_2');
      if (!token) return;

      const newDeletedIds = new Set(deletedIds).add(id);
      setDeletedIds(newDeletedIds);
      await saveDeletedIds(newDeletedIds);
      setNotifications(prev => prev.filter(n => n.id !== id));
      // Update total count optimistically
      setPagination(prev => ({ ...prev, totalCount: Math.max(0, prev.totalCount - 1) }));

      await fetch(`${BACKEND_URL}/core/deleteNotification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, notification_id: id }),
      });
    } catch (error) {
      console.error('❌ Error deleting notification:', error);
    } finally {
      setDeletingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  }, [deletingIds, deletedIds, saveDeletedIds]);

  // ============================================================================
  // DELETE — selected / all
  //
  // KEY DESIGN DECISION:
  //   If `allSelected` is true (user tapped "Select All" which semantically means
  //   "all notifications on the server, not just loaded ones"), we call the
  //   deleteAll endpoint with NO ids → backend deletes everything for this user.
  //
  //   If `allSelected` is false, the user only selected specific visible items,
  //   so we pass their IDs to deleteAll (which also accepts a subset of IDs).
  // ============================================================================
  const handleDeleteSelected = useCallback(async () => {
    if (selectedIds.size === 0 && !allSelected) return;

    const label = allSelected
      ? `all ${pagination.totalCount} notifications`
      : `${selectedIds.size} notification${selectedIds.size > 1 ? 's' : ''}`;

    Alert.alert(
      'Delete Notifications',
      `Are you sure you want to delete ${label}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('token_2');
              if (!token) return;

              if (allSelected) {
                // Delete ALL — backend call without ids
                log.interaction('Delete ALL notifications (backend)');
                const response = await fetch(`${BACKEND_URL}/core/deleteAllNotifications`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ token }),
                });
                if (response.ok) {
                  setNotifications([]);
                  setDeletedIds(new Set());
                  await AsyncStorage.removeItem('deleted_notification_ids');
                  await AsyncStorage.removeItem('notification_read_status');
                  setPagination({ currentPage: 1, hasMore: false, totalCount: 0, totalPages: 1, isLoadingMore: false });
                } else {
                  console.error('❌ Failed to delete all notifications');
                  Alert.alert('Error', 'Failed to delete all notifications. Please try again.');
                }
              } else {
                // Delete a specific subset
                const idsToDelete = Array.from(selectedIds);
                log.interaction('Delete selected notifications', { count: idsToDelete.length });

                const newDeletedIds = new Set(deletedIds);
                idsToDelete.forEach(id => newDeletedIds.add(id));
                setDeletedIds(newDeletedIds);
                await saveDeletedIds(newDeletedIds);

                setNotifications(prev => prev.filter(n => !selectedIds.has(n.id)));
                setPagination(prev => ({
                  ...prev,
                  totalCount: Math.max(0, prev.totalCount - idsToDelete.length),
                }));

                // Fire-and-forget batch delete via the deleteAll endpoint with ids
                fetch(`${BACKEND_URL}/core/deleteAllNotifications`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ token, ids: idsToDelete }),
                }).catch(err => console.error('❌ Batch delete failed:', err));
              }

              setSelectedIds(new Set());
              setAllSelected(false);
              setSelectionMode(false);
            } catch (error) {
              console.error('❌ Error deleting selected notifications:', error);
              Alert.alert('Error', 'Something went wrong. Please try again.');
            }
          }
        }
      ]
    );
  }, [selectedIds, allSelected, deletedIds, saveDeletedIds, pagination.totalCount]);

  // ============================================================================
  // SELECTION MODE
  // ============================================================================
  const toggleSelectionMode = useCallback(() => {
    React.startTransition(() => {
      setSelectionMode(prev => !prev);
      setSelectedIds(new Set());
      setAllSelected(false);
    });
  }, []);

  /**
   * "Select All" in pagination context means two things:
   *   1. Select all LOADED notifications in the UI (for visual feedback)
   *   2. Set `allSelected = true` so the delete handler knows to call deleteAll
   *      on the backend (which covers unloaded pages too)
   *
   * Tapping again deselects all.
   */
  const toggleSelectAll = useCallback(() => {
    if (allSelected || selectedIds.size === notifications.length) {
      // Deselect everything
      setSelectedIds(new Set());
      setAllSelected(false);
    } else {
      // Select all loaded notifications AND flag that we mean "all on server"
      setSelectedIds(new Set(notifications.map(n => n.id)));
      setAllSelected(true);
    }
  }, [notifications, selectedIds.size, allSelected]);

  const toggleSelectItem = useCallback((id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
    // If user manually deselects an item, they're no longer selecting "all"
    setAllSelected(false);
  }, []);

  // ============================================================================
  // PULL TO REFRESH — resets to page 1
  // ============================================================================
  const onRefresh = useCallback(async () => {
    if (!notificationsEnabled) {
      setRefreshing(false);
      return;
    }
    setRefreshing(true);
    setAllSelected(false);
    setSelectedIds(new Set());
    setSelectionMode(false);
    await fetchNotifications(1, false);
  }, [notificationsEnabled, fetchNotifications]);

  // ============================================================================
  // PRESS HANDLERS
  // ============================================================================
  const handleNavigateToModule = useCallback((go_to: string | null | undefined) => {
    if (!go_to) return;
    if (onNavigateToModule) onNavigateToModule(go_to);
  }, [onNavigateToModule]);

  const handleNotificationPress = useCallback((notification: Notification) => {
    if (!notificationsEnabled) return;

    if (selectionMode) {
      toggleSelectItem(notification.id);
      return;
    }

    if (!notification.Read) handleMarkAsRead(notification.id);

    if (notification.go_to) {
      setModalVisible(false);
      onBack();
      setTimeout(() => handleNavigateToModule(notification.go_to), 150);
      return;
    }

    setSelectedNotification(notification);
    setModalVisible(true);
    Animated.spring(modalAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
  }, [notificationsEnabled, selectionMode, toggleSelectItem, handleMarkAsRead, handleNavigateToModule, modalAnim, onBack]);

  const handleNotificationLongPress = useCallback((notification: Notification) => {
    if (!notificationsEnabled) return;
    React.startTransition(() => {
      if (!selectionMode) setSelectionMode(true);
      toggleSelectItem(notification.id);
    });
  }, [notificationsEnabled, selectionMode, toggleSelectItem]);

  const closeModal = useCallback(() => {
    Animated.timing(modalAnim, {
      toValue: height,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setModalVisible(false);
      setSelectedNotification(null);
      modalAnim.setValue(height);
    });
  }, [modalAnim]);

  const handleModalActionPress = useCallback(() => {
    if (selectedNotification?.go_to) {
      closeModal();
      setTimeout(() => {
        onBack();
        setTimeout(() => handleNavigateToModule(selectedNotification.go_to), 150);
      }, 300);
    } else {
      closeModal();
    }
  }, [selectedNotification, closeModal, handleNavigateToModule, onBack]);

  // ============================================================================
  // DERIVED STATE
  // ============================================================================
  const groupedNotifications = useMemo(() => ({
    today: notifications.filter(n => n.category === 'today'),
    week: notifications.filter(n => n.category === 'week'),
    earlier: notifications.filter(n => n.category === 'earlier'),
  }), [notifications]);

  const unreadCount = useMemo(() => notifications.filter(n => !n.Read).length, [notifications]);

  // The "Select All" button label changes based on whether everything is selected
  const selectAllLabel = useMemo(() => {
    if (allSelected) return 'Deselect All';
    if (selectedIds.size === notifications.length && notifications.length > 0) return 'Deselect All';
    return pagination.hasMore ? `Select All (${pagination.totalCount})` : 'Select All';
  }, [allSelected, selectedIds.size, notifications.length, pagination.hasMore, pagination.totalCount]);

  const SectionHeader = React.memo(({ title, count }: { title: string; count: number }) =>
    count > 0 ? (
      <View style={s.sectionHdr}>
        <Text style={[s.sectionTitle, { color: currentColors.textSecondary }]}>{title}</Text>
      </View>
    ) : null
  );

  // ============================================================================
  // RENDER
  // ============================================================================
  return (
    <View style={[s.container, { backgroundColor: currentColors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={currentColors.header} />

      {/* ── Header ─────────────────────────────────────────────────────────── */}
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

          <View style={[s.hdrTitleBox, selectionMode && { left: 90, right: 160 }]}>
            <Text style={[s.hdrTitle, { color: "#FFFFFF" }]} numberOfLines={1}>
              {selectionMode
                ? (allSelected
                  ? `All ${pagination.totalCount} Selected`
                  : `${selectedIds.size} Selected`)
                : 'Notifications'}
            </Text>
          </View>

          {selectionMode ? (
            <View style={s.selectionActions}>
              <TouchableOpacity style={s.selectAllBtn} onPress={toggleSelectAll} activeOpacity={0.6}>
                <Text style={[s.selectAllText, { color: "#FFFFFF" }]} numberOfLines={1}>
                  {selectAllLabel}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.deleteSelectedBtn, { opacity: (selectedIds.size === 0 && !allSelected) ? 0.4 : 1 }]}
                onPress={handleDeleteSelected}
                disabled={selectedIds.size === 0 && !allSelected}
                activeOpacity={0.6}
              >
                <Ionicons name="trash" size={22} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity style={s.cancelBtn} onPress={toggleSelectionMode} activeOpacity={0.6}>
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
                  opacity: !notificationsEnabled ? 0.4 : 1
                }]}
                onPress={markAllNotificationsAsRead}
                disabled={!notificationsEnabled}
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
              {' • '}{pagination.totalCount > 0 ? pagination.totalCount : notifications.length} total
              {pagination.hasMore ? ` (${notifications.length} loaded)` : ''}
            </Text>
          </View>
        )}
      </View>

      {/* ── Content ────────────────────────────────────────────────────────── */}
      <SafeAreaView style={s.safeArea} edges={['left', 'right', 'bottom']}>
        <ScrollView
          ref={scrollViewRef}
          style={s.scroll}
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={handleScroll}
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
                color: currentColors.textSecondary, textAlign: 'center', marginHorizontal: 20
              }]}>
                Notifications are currently turned off in your settings.{'\n\n'}
                You can enable them in Settings → Notifications to receive alerts and updates.
              </Text>
              <TouchableOpacity
                style={[s.enableButton, { backgroundColor: currentColors.primary, marginTop: 20 }]}
                onPress={onBack}
                activeOpacity={0.7}
              >
                <Text style={[s.enableButtonText, { color: '#FFFFFF' }]}>Go to Settings</Text>
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
                  {groupedNotifications.today.map((n, i) => (
                    <NotificationItem
                      key={n.id}
                      notification={n}
                      index={i}
                      isSelected={allSelected || selectedIds.has(n.id)}
                      onPress={handleNotificationPress}
                      onLongPress={handleNotificationLongPress}
                      onDelete={handleDelete}
                      selectionMode={selectionMode}
                      notificationColor={getNotificationColor(n.type)}
                      notificationsEnabled={notificationsEnabled}
                      currentColors={currentColors}
                    />
                  ))}
                </>
              )}
              {groupedNotifications.week.length > 0 && (
                <>
                  <SectionHeader title="EARLIER" count={groupedNotifications.week.length} />
                  {groupedNotifications.week.map((n, i) => (
                    <NotificationItem
                      key={n.id}
                      notification={n}
                      index={i + groupedNotifications.today.length}
                      isSelected={allSelected || selectedIds.has(n.id)}
                      onPress={handleNotificationPress}
                      onLongPress={handleNotificationLongPress}
                      onDelete={handleDelete}
                      selectionMode={selectionMode}
                      notificationColor={getNotificationColor(n.type)}
                      notificationsEnabled={notificationsEnabled}
                      currentColors={currentColors}
                    />
                  ))}
                </>
              )}
              {groupedNotifications.earlier.length > 0 && (
                <>
                  {groupedNotifications.week.length === 0 && groupedNotifications.today.length === 0 && (
                    <SectionHeader title="EARLIER" count={groupedNotifications.earlier.length} />
                  )}
                  {groupedNotifications.earlier.map((n, i) => (
                    <NotificationItem
                      key={n.id}
                      notification={n}
                      index={i + groupedNotifications.today.length + groupedNotifications.week.length}
                      isSelected={allSelected || selectedIds.has(n.id)}
                      onPress={handleNotificationPress}
                      onLongPress={handleNotificationLongPress}
                      onDelete={handleDelete}
                      selectionMode={selectionMode}
                      notificationColor={getNotificationColor(n.type)}
                      notificationsEnabled={notificationsEnabled}
                      currentColors={currentColors}
                    />
                  ))}
                </>
              )}

              {/* Load-more footer (spinner or blank spacer) */}
              <LoadMoreFooter
                isLoadingMore={pagination.isLoadingMore}
                hasMore={pagination.hasMore}
                currentColors={currentColors}
              />
            </Animated.View>
          )}
          <View style={s.bottomSpace} />
        </ScrollView>
      </SafeAreaView>

      {/* ── Detail Modal ───────────────────────────────────────────────────── */}
      <Modal
        animationType="none"
        transparent={true}
        visible={modalVisible}
        onRequestClose={closeModal}
        statusBarTranslucent
        hardwareAccelerated
      >
        <View style={[s.modalOverlay, { backgroundColor: currentColors.overlay }]}>
          <TouchableOpacity style={s.modalOverlayTouch} activeOpacity={1} onPress={closeModal}>
            <Animated.View style={[
              s.modalBox,
              { backgroundColor: currentColors.card, transform: [{ translateY: modalAnim }] }
            ]}>
              <TouchableOpacity style={s.modalDrag} activeOpacity={1} onPress={closeModal}>
                <View style={[s.dragHandle, { backgroundColor: currentColors.textTertiary }]} />
              </TouchableOpacity>

              <ScrollView
                style={s.modalContent}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 30 }}
              >
                {selectedNotification && (
                  <>
                    <View style={s.modalHdr}>
                      <View style={[
                        s.modalIconBox,
                        {
                          backgroundColor: `${getNotificationColor(selectedNotification.type)}15`,
                          borderWidth: 2,
                          borderColor: `${getNotificationColor(selectedNotification.type)}30`
                        }
                      ]}>
                        <Ionicons
                          name={selectedNotification.icon as any}
                          size={40}
                          color={getNotificationColor(selectedNotification.type)}
                        />
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
                        <View style={[
                          s.typeBadge,
                          { backgroundColor: `${getNotificationColor(selectedNotification.type)}15` }
                        ]}>
                          <Ionicons
                            name={selectedNotification.icon as any}
                            size={12}
                            color={getNotificationColor(selectedNotification.type)}
                          />
                          <Text style={[s.typeText, { color: getNotificationColor(selectedNotification.type) }]}>
                            {selectedNotification.type.toUpperCase()}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <View style={[s.modalDivider, { backgroundColor: currentColors.divider }]} />

                    <View style={[s.modalMsgCard, { backgroundColor: currentColors.background }]}>
                      <Text style={[s.modalMsg, { color: currentColors.text }]}>
                        {selectedNotification.message}
                      </Text>
                    </View>

                    {selectedNotification.page && (
                      <View style={s.modalInfoSec}>
                        <View style={[s.modalInfoItem, { marginBottom: 8 }]}>
                          <Ionicons name="document-outline" size={16} color={currentColors.textSecondary} />
                          <Text style={[s.modalInfoText, { color: currentColors.textSecondary }]}>
                            Page: {selectedNotification.page}
                          </Text>
                        </View>
                      </View>
                    )}

                    <View style={s.modalActions}>
                      {selectedNotification.go_to && (
                        <TouchableOpacity
                          style={[s.modalActionBtn, { backgroundColor: currentColors.primary }]}
                          onPress={handleModalActionPress}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                          <Text style={s.modalActionBtnText}>
                            Go to {selectedNotification.page || 'Module'}
                          </Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        style={[s.modalActionBtn2, { backgroundColor: currentColors.cardHover }]}
                        onPress={closeModal}
                        activeOpacity={0.7}
                      >
                        <Text style={[s.modalActionBtn2Text, { color: currentColors.text }]}>Close</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </ScrollView>
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
  header: { paddingHorizontal: 16, paddingBottom: 12, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3 },
  hdrContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, paddingBottom: 4 },
  backBtn: { width: 85, height: 40, alignItems: 'flex-start', justifyContent: 'center', zIndex: 1 },
  backBtnContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start' },
  backBtnText: { fontSize: 16, fontWeight: '500', marginLeft: 4 },
  hdrTitleBox: { position: 'absolute', left: 0, right: 0, alignItems: 'center', justifyContent: 'center', zIndex: 0 },
  hdrTitle: { fontSize: 18, fontWeight: '600' },
  normalActions: { flexDirection: 'row', alignItems: 'center', gap: 8, zIndex: 1 },
  selectionModeBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  markAllBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  selectionActions: { flexDirection: 'row', alignItems: 'center', gap: 2, zIndex: 1 },
  selectAllBtn: { paddingHorizontal: 6, paddingVertical: 5, borderRadius: 5, backgroundColor: 'rgba(255, 255, 255, 0.15)', maxWidth: 130 },
  selectAllText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },
  deleteSelectedBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  cancelBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  hdrStats: { marginTop: 4, marginBottom: 4, alignItems: 'center' },
  hdrStatsText: { fontSize: 13, fontWeight: '400' },
  scroll: { flex: 1 },
  scrollContent: { paddingTop: 8 },
  sectionHdr: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, marginTop: 8 },
  sectionTitle: { fontSize: 13, fontWeight: '600', letterSpacing: 0.5 },
  notifContainer: { position: 'relative', marginBottom: 1, height: 90 },
  notifCard: { position: 'relative', zIndex: 1 },
  notifContent: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14 },
  checkboxContainer: { marginRight: 10, justifyContent: 'center', alignItems: 'center' },
  checkbox: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  delBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', marginLeft: 8, marginTop: 2 },
  iconBox: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginRight: 14, marginTop: 2 },
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
  loadMoreFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 20 },
  loadMoreText: { fontSize: 14 },
  loadMoreSpacer: { height: 20 },
  modalOverlay: { flex: 1 },
  modalOverlayTouch: { flex: 1, justifyContent: 'flex-end' },
  modalBox: { maxHeight: height * 0.75, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 24 },
  modalDrag: { alignItems: 'center', paddingVertical: 14 },
  dragHandle: { width: 40, height: 4, borderRadius: 2, opacity: 0.3 },
  modalContent: { paddingHorizontal: 24 },
  modalHdr: { alignItems: 'center', marginTop: 8, marginBottom: 20 },
  modalIconBox: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  modalTitleSec: { marginBottom: 20 },
  modalTitle: { fontSize: 24, fontWeight: '700', marginBottom: 14, letterSpacing: 0.3, textAlign: 'center', lineHeight: 32 },
  modalMetaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  modalMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  modalMetaText: { fontSize: 14, fontWeight: '500' },
  typeBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, gap: 6 },
  typeText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  modalDivider: { height: 1, marginVertical: 24 },
  modalMsgCard: { padding: 20, borderRadius: 16, marginBottom: 24 },
  modalMsg: { fontSize: 16, lineHeight: 26, letterSpacing: 0.3 },
  modalInfoSec: { marginBottom: 24 },
  modalInfoItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 8 },
  modalInfoText: { fontSize: 14, fontWeight: '500' },
  modalActions: { flexDirection: 'column', gap: 12 },
  modalActionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 14, paddingVertical: 16, paddingHorizontal: 24, gap: 10 },
  modalActionBtnText: { fontSize: 17, fontWeight: '600', color: '#FFFFFF', letterSpacing: 0.3 },
  modalActionBtn2: { alignItems: 'center', justifyContent: 'center', borderRadius: 14, paddingVertical: 16, paddingHorizontal: 24 },
  modalActionBtn2Text: { fontSize: 17, fontWeight: '600', letterSpacing: 0.3 },
});

export default Notifications;