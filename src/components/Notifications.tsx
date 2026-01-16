import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Animated,
  Dimensions,
  Platform,
  RefreshControl,
  Modal,
  Alert,
  LayoutAnimation,
  UIManager,
  PanResponder,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import * as ExpoNotifications from 'expo-notifications';
import { BACKEND_URL } from '../config/config';

// Configure notification handler for iOS badge support
ExpoNotifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,  // Added missing property
    shouldShowList: true,     // Added missing property
  }),
});

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width, height } = Dimensions.get('window');

const whatsappColors = {
  dark: {
    background: '#0B141A',
    card: '#1C2832',
    cardHover: '#202C33',
    text: '#E9EDEF',
    textSecondary: '#8696A0',
    textTertiary: '#667781',
    border: '#2A3942',
    primary: '#00A884',
    primaryDark: '#008069',
    header: '#1F2C34',
    icon: '#AEBAC1',
    danger: '#F15C6D',
    warning: '#F59E0B',
    success: '#00A884',
    unreadBg: '#182229',
    divider: '#233138',
    overlay: 'rgba(11, 20, 26, 0.95)',
    shadow: 'rgba(0, 0, 0, 0.3)',
  },
  light: {
    background: '#e7e6e5',
    card: '#FFFFFF',
    cardHover: '#F5F6F6',
    text: '#111B21',
    textSecondary: '#667781',
    textTertiary: '#8696A0',
    border: '#E9EDEF',
    primary: '#00A884',
    primaryDark: '#008069',
    header: '#008069',
    icon: '#54656F',
    danger: '#F15C6D',
    warning: '#F59E0B',
    success: '#00A884',
    unreadBg: '#F7F8FA',
    divider: '#E9EDEF',
    overlay: 'rgba(0, 0, 0, 0.6)',
    shadow: 'rgba(0, 0, 0, 0.08)',
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

const Notifications: React.FC<NotificationsProps> = ({ 
  onBack, 
  isDark = false,
  onBadgeUpdate 
}) => {
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

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const modalAnim = useRef(new Animated.Value(height)).current;

  // Function to update iOS badge count
  const updateIOSBadgeCount = async (count: number) => {
    if (Platform.OS === 'ios') {
      try {
        // Set the badge count on iOS
        await ExpoNotifications.setBadgeCountAsync(count);
        console.log(`✅ iOS badge count updated to: ${count}`);
        
        // Clear all notifications from tray when count is 0
        if (count === 0) {
          await ExpoNotifications.dismissAllNotificationsAsync();
          console.log('✅ Cleared all notifications from tray');
        }
      } catch (error) {
        console.error('❌ Error updating iOS badge count:', error);
      }
    }
  };

  // Function to request notification permissions
  const requestNotificationPermissions = async () => {
    if (Platform.OS === 'ios') {
      try {
        const { status } = await ExpoNotifications.requestPermissionsAsync({
          ios: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
            // Removed allowAnnouncements as it's not a valid property
          },
        });
        
        if (status !== 'granted') {
          console.warn('⚠️ Notification permissions not granted - badge updates may not work');
        } else {
          console.log('✅ Notification permissions granted');
        }
      } catch (error) {
        console.error('❌ Error requesting notification permissions:', error);
      }
    }
  };

  useEffect(() => {
    // Request permissions when component mounts
    requestNotificationPermissions();
    
    // Fetch notifications
    fetchNotifications();
    
    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
    
    // Cleanup function when component unmounts
    return () => {
      // Ensure badge count is accurate when leaving
      const unreadCount = notifications.filter(n => !n.Read).length;
      updateIOSBadgeCount(unreadCount).catch(console.error);
    };
  }, []);

  // Update badge whenever notifications change
  useEffect(() => {
    const unreadCount = notifications.filter(n => !n.Read).length;
    
    // Call parent callback for badge update
    onBadgeUpdate?.(unreadCount);
    
    // Update iOS badge
    updateIOSBadgeCount(unreadCount);
    
    console.log(`📱 Total: ${notifications.length}, Unread: ${unreadCount}`);
    
    // Save read status locally for persistence
    if (notifications.length > 0) {
      saveReadStatusLocally();
    }
  }, [notifications]);

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
      if (savedStatus) {
        return JSON.parse(savedStatus);
      }
    } catch (error) {
      console.error('❌ Error loading local read status:', error);
    }
    return {};
  };

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('token_2');
      if (!token) {
        console.error('❌ No authentication token found');
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
        
        if (data.notifications && data.notifications.length > 0) {
          console.log('📝 Sample notification from backend:', {
            id: data.notifications[0].id,
            title: data.notifications[0].title,
            Read: data.notifications[0].Read,
          });
        }
        
        const formattedNotifications = data.notifications.map((notif: any) => {
          const formatted = formatNotification(notif);
          
          // Override with local read status if available
          if (!formatted.Read && localReadStatus[formatted.id] === true) {
            console.log(`✅ Notification ${formatted.id} marked as read from local storage`);
            return { ...formatted, Read: true };
          }
          
          return formatted;
        });
        
        // Sort: unread first, then by date
        formattedNotifications.sort((a: Notification, b: Notification) => {
          if (a.Read !== b.Read) {
            return a.Read ? 1 : -1;
          }
          if (a.created_at && b.created_at) {
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          }
          return 0;
        });
        
        setNotifications(formattedNotifications);
        
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
      timeText = createdAt.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
      category = 'earlier';
    }

    const isRead = Boolean(
      notif.Read || 
      notif.is_read || 
      notif.read || 
      notif.isRead ||
      false
    );

    return {
      id: notif.id.toString(),
      title: notif.title,
      message: notif.message,
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
      attendance: 'checkmark-circle',
      hr: 'people',
      cab: 'car',
      leave: 'calendar',
      reminder: 'time',
      success: 'checkmark-circle',
      warning: 'warning',
      error: 'alert-circle',
      info: 'information-circle',
      system: 'settings',
    };
    return iconMap[type] || 'notifications';
  };

  const getNotificationColor = (type: string) => {
    const colorMap: { [key: string]: string } = {
      attendance: '#00A884',
      hr: '#8B5CF6',
      cab: '#F59E0B',
      leave: '#3B82F6',
      reminder: '#A855F7',
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
      info: '#3B82F6',
      system: '#6B7280',
    };
    return colorMap[type] || currentColors.primary;
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      const token = await AsyncStorage.getItem('token_2');
      if (!token) return;

      // Optimistic update
      setNotifications(prev =>
        prev.map(notif =>
          notif.id === id ? { ...notif, Read: true } : notif
        )
      );

      // Call backend
      const response = await fetch(`${BACKEND_URL}/core/markNotificationAsRead`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, notification_id: id }),
      });

      if (!response.ok) {
        console.error('❌ Failed to mark notification as read on backend');
        // Revert on failure
        setNotifications(prev =>
          prev.map(notif =>
            notif.id === id ? { ...notif, Read: false } : notif
          )
        );
      } else {
        console.log(`✅ Notification ${id} marked as read`);
      }
    } catch (error) {
      console.error('❌ Error marking notification as read:', error);
      // Revert on error
      setNotifications(prev =>
        prev.map(notif =>
          notif.id === id ? { ...notif, Read: false } : notif
        )
      );
    }
  };

  const markAllNotificationsAsRead = async () => {
    const unreadNotifications = notifications.filter(n => !n.Read);
    if (unreadNotifications.length === 0) {
      console.log('✅ No unread notifications to mark');
      return;
    }

    try {
      const token = await AsyncStorage.getItem('token_2');
      if (!token) return;

      const originalNotifications = [...notifications];

      // Optimistic update
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setNotifications(prev => prev.map(notif => ({ ...notif, Read: true })));

      // Force iOS badge to 0 immediately
      await updateIOSBadgeCount(0);

      // Call backend
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
      // On error, refresh to get correct state
      fetchNotifications();
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

      const response = await fetch(`${BACKEND_URL}/core/deleteNotification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, notification_id: id }),
      });

      if (response.ok) {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setNotifications(prev => prev.filter(notif => notif.id !== id));
        console.log(`✅ Notification ${id} deleted successfully`);
      } else {
        console.error('❌ Failed to delete notification on backend');
        Alert.alert('Error', 'Failed to delete notification. Please try again.');
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

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  };

  const handleNotificationPress = (notification: Notification) => {
    // Mark as read if unread
    if (!notification.Read) {
      handleMarkAsRead(notification.id);
    }
    
    // Show modal
    setSelectedNotification(notification);
    setModalVisible(true);
    Animated.spring(modalAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
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
    const translateX = useRef(new Animated.Value(0)).current;
    const itemOpacity = useRef(new Animated.Value(0)).current;
    const itemScale = useRef(new Animated.Value(0.95)).current;
    const deleteScale = useRef(new Animated.Value(1)).current;
    const notificationColor = getNotificationColor(notification.type);
    const [isSwiping, setIsSwiping] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    
    const SWIPE_THRESHOLD = 100;
    const DELETE_THRESHOLD = 150;
    const MAX_SWIPE = 100;
    
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

    const animateDelete = () => {
      setIsDeleting(true);
      
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: -width,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(itemOpacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(() => {
        handleDelete(notification.id);
      });
    };

    const panResponder = useRef(
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onStartShouldSetPanResponderCapture: () => false,
        
        onMoveShouldSetPanResponder: (evt, gestureState) => {
          const isHorizontal = Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.5;
          const isLeftSwipe = gestureState.dx < -10;
          const hasMovedEnough = Math.abs(gestureState.dx) > 8;
          
          if (isHorizontal && isLeftSwipe && hasMovedEnough && !isDeleting) {
            setIsSwiping(true);
            setScrollEnabled(false);
            return true;
          }
          return false;
        },
        
        onMoveShouldSetPanResponderCapture: (evt, gestureState) => {
          const isHorizontal = Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.5;
          const isLeftSwipe = gestureState.dx < -10;
          
          return isHorizontal && isLeftSwipe && !isDeleting;
        },
        
        onPanResponderGrant: () => {
          setScrollEnabled(false);
        },
        
        onPanResponderMove: (evt, gestureState) => {
          if (!isDeleting && gestureState.dx < -5) {
            const clampedDx = Math.max(gestureState.dx, -MAX_SWIPE);
            translateX.setValue(clampedDx);
            
            const progress = Math.min(Math.abs(clampedDx) / MAX_SWIPE, 1);
            deleteScale.setValue(0.8 + (progress * 0.2));
          }
        },
        
        onPanResponderRelease: (evt, gestureState) => {
          setScrollEnabled(true);
          
          if (isDeleting) return;
          
          const distance = Math.abs(gestureState.dx);
          const velocity = Math.abs(gestureState.vx);
          
          const shouldDelete = distance > DELETE_THRESHOLD || 
                              (distance > SWIPE_THRESHOLD && velocity > 0.5);
          
          if (shouldDelete && gestureState.dx < 0) {
            animateDelete();
          } else if (distance > SWIPE_THRESHOLD / 2) {
            Animated.spring(translateX, {
              toValue: -MAX_SWIPE,
              useNativeDriver: true,
              tension: 80,
              friction: 10,
            }).start();
          } else {
            Animated.spring(translateX, {
              toValue: 0,
              useNativeDriver: true,
              tension: 80,
              friction: 10,
            }).start();
          }
          
          setTimeout(() => setIsSwiping(false), 100);
        },
        
        onPanResponderTerminate: () => {
          if (isDeleting) return;
          
          setScrollEnabled(true);
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            tension: 80,
            friction: 10,
          }).start();
          setTimeout(() => setIsSwiping(false), 100);
        },
      })
    ).current;

    const deleteOpacity = translateX.interpolate({
      inputRange: [-MAX_SWIPE, -20, 0],
      outputRange: [1, 0.3, 0],
      extrapolate: 'clamp',
    });

    return (
      <Animated.View 
        style={[
          styles.notificationItemContainer,
          {
            opacity: itemOpacity,
            transform: [{ scale: itemScale }],
          }
        ]}
      >
        <Animated.View 
          style={[
            styles.deleteButtonContainer,
            { 
              opacity: deleteOpacity,
            }
          ]}
        >
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={animateDelete}
            activeOpacity={0.7}
          >
            <Animated.View style={{ transform: [{ scale: deleteScale }] }}>
              <Ionicons name="trash-outline" size={22} color="#FFFFFF" />
            </Animated.View>
          </TouchableOpacity>
        </Animated.View>

        <Animated.View
          style={[
            styles.notificationCard,
            { 
              backgroundColor: notification.Read ? currentColors.card : currentColors.unreadBg,
              transform: [{ translateX }],
            }
          ]}
          {...panResponder.panHandlers}
        >
          <TouchableOpacity
            style={styles.notificationContent}
            onPress={() => !isSwiping && !isDeleting && handleNotificationPress(notification)}
            activeOpacity={0.6}
            delayPressIn={50}
            disabled={isDeleting}
          >
            <View style={[
              styles.iconContainer,
              { backgroundColor: `${notificationColor}20` }
            ]}>
              <Ionicons
                name={notification.icon as any}
                size={22}
                color={notificationColor}
              />
            </View>

            <View style={styles.notificationTextContainer}>
              <View style={styles.titleRow}>
                <Text
                  style={[
                    styles.notificationTitle,
                    { 
                      color: currentColors.text,
                      fontWeight: notification.Read ? '400' : '600',
                    }
                  ]}
                  numberOfLines={1}
                >
                  {notification.title}
                </Text>
                <Text style={[styles.notificationTime, { 
                  color: currentColors.textTertiary,
                  fontWeight: notification.Read ? '400' : '500',
                }]}>
                  {notification.time}
                </Text>
              </View>
              
              <Text
                style={[
                  styles.notificationMessage,
                  { 
                    color: notification.Read ? currentColors.textSecondary : currentColors.text,
                  }
                ]}
                numberOfLines={2}
              >
                {notification.message}
              </Text>
            </View>

            {!notification.Read && (
              <View style={styles.unreadIndicatorContainer}>
                <View style={[styles.unreadDot, { backgroundColor: currentColors.primary }]} />
              </View>
            )}
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    );
  };

  const SectionHeader = ({ title, count }: { title: string; count: number }) => (
    count > 0 ? (
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: currentColors.textSecondary }]}>
          {title}
        </Text>
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
    <View style={[styles.container, { backgroundColor: currentColors.background }]}>
      <StatusBar 
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={currentColors.header} 
      />
      
      <View style={[styles.header, { 
        backgroundColor: currentColors.header,
        paddingTop: Platform.OS === 'ios' ? insets.top : StatusBar.currentHeight || 0,
        borderBottomWidth: 1,
        borderBottomColor: currentColors.border,
      }]}>
        <View style={styles.headerContent}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={onBack}
            activeOpacity={0.6}
          >
            <View style={styles.backButtonContent}>
              <Ionicons 
                name="chevron-back" 
                size={24} 
                color={isDark ? "#FFFFFF" : "#FFFFFF"} 
              />
              <Text style={[styles.backButtonText, { 
                color: isDark ? "#FFFFFF" : "#FFFFFF" 
              }]}>
                Back
              </Text>
            </View>
          </TouchableOpacity>
          
          <View style={styles.headerTitleContainer}>
            <Text style={[styles.headerTitle, { 
              color: isDark ? "#FFFFFF" : "#FFFFFF" 
            }]}>
              Notifications
            </Text>
          </View>
          
          <TouchableOpacity 
            style={[styles.markAllButton, {
              opacity: unreadCount === 0 ? 0.4 : 1
            }]}
            onPress={markAllNotificationsAsRead}
            disabled={unreadCount === 0}
            activeOpacity={0.6}
          >
            <Ionicons 
              name="checkmark-done" 
              size={24} 
              color={isDark ? "#FFFFFF" : "#FFFFFF"} 
            />
          </TouchableOpacity>
        </View>
        {notifications.length > 0 && (
          <View style={styles.headerStats}>
            <Text style={[styles.headerStatsText, { 
              color: isDark ? "rgba(255, 255, 255, 0.7)" : "rgba(255, 255, 255, 0.85)" 
            }]}>
              {unreadCount > 0 ? `${unreadCount} new` : 'All caught up'} • {notifications.length} total
            </Text>
          </View>
        )}
      </View>
      
      <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
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
            />
          }
        >
          {loading ? (
            <View style={styles.emptyContainer}>
              <Animated.View style={[styles.loadingIndicator, {
                opacity: fadeAnim,
              }]}>
                <Ionicons name="notifications-outline" size={56} color={currentColors.textSecondary} />
                <Text style={[styles.emptyMessage, { color: currentColors.textSecondary, marginTop: 16 }]}>
                  Loading notifications...
                </Text>
              </Animated.View>
            </View>
          ) : notifications.length === 0 ? (
            <Animated.View style={[styles.emptyContainer, { opacity: fadeAnim }]}>
              <View
                style={[
                  styles.emptyIconContainer,
                  { backgroundColor: currentColors.card }
                ]}
              >
                <Ionicons
                  name="notifications-off-outline"
                  size={56}
                  color={currentColors.textSecondary}
                />
              </View>
              <Text style={[styles.emptyTitle, { color: currentColors.text }]}>
                No notifications yet
              </Text>
              <Text style={[styles.emptyMessage, { color: currentColors.textSecondary }]}>
                We'll notify you when something important happens
              </Text>
            </Animated.View>
          ) : (
            <Animated.View style={{ opacity: fadeAnim }}>
              {groupedNotifications.today.length > 0 && (
                <>
                  <SectionHeader title="NEW" count={groupedNotifications.today.length} />
                  {groupedNotifications.today.map((notification, index) => (
                    <NotificationItem key={notification.id} notification={notification} index={index} />
                  ))}
                </>
              )}

              {groupedNotifications.week.length > 0 && (
                <>
                  <SectionHeader title="EARLIER" count={groupedNotifications.week.length} />
                  {groupedNotifications.week.map((notification, index) => (
                    <NotificationItem 
                      key={notification.id} 
                      notification={notification} 
                      index={index + groupedNotifications.today.length} 
                    />
                  ))}
                </>
              )}

              {groupedNotifications.earlier.length > 0 && (
                <>
                  {groupedNotifications.week.length === 0 && groupedNotifications.today.length === 0 && (
                    <SectionHeader title="EARLIER" count={groupedNotifications.earlier.length} />
                  )}
                  {groupedNotifications.earlier.map((notification, index) => (
                    <NotificationItem 
                      key={notification.id} 
                      notification={notification} 
                      index={index + groupedNotifications.today.length + groupedNotifications.week.length} 
                    />
                  ))}
                </>
              )}
            </Animated.View>
          )}
          
          <View style={styles.bottomSpacing} />
        </ScrollView>
      </SafeAreaView>

      <Modal
        animationType="none"
        transparent={true}
        visible={modalVisible}
        onRequestClose={closeModal}
        statusBarTranslucent
        hardwareAccelerated
      >
        <View style={[styles.modalOverlay, { backgroundColor: currentColors.overlay }]}>
          <TouchableOpacity 
            style={styles.modalOverlayTouchable}
            activeOpacity={1}
            onPress={closeModal}
          >
            <Animated.View style={[styles.modalContainer, {
              backgroundColor: currentColors.background,
              transform: [{ translateY: modalAnim }],
            }]}>
              <TouchableOpacity activeOpacity={1}>
                <View style={styles.modalDragIndicator}>
                  <View style={[styles.dragHandle, { backgroundColor: currentColors.textTertiary }]} />
                </View>

                {selectedNotification && (
                  <ScrollView 
                    style={styles.modalContent}
                    showsVerticalScrollIndicator={false}
                    bounces={false}
                  >
                    <View style={styles.modalHeader}>
                      <View
                        style={[
                          styles.modalIconContainer,
                          { backgroundColor: `${getNotificationColor(selectedNotification.type)}20` }
                        ]}
                      >
                        <Ionicons
                          name={selectedNotification.icon as any}
                          size={32}
                          color={getNotificationColor(selectedNotification.type)}
                        />
                      </View>
                    </View>

                    <View style={styles.modalTitleSection}>
                      <Text style={[styles.modalTitle, { color: currentColors.text }]}>
                        {selectedNotification.title}
                      </Text>
                      
                      <View style={styles.modalMetaRow}>
                        <View style={styles.modalMetaItem}>
                          <Ionicons name="time-outline" size={14} color={currentColors.textSecondary} />
                          <Text style={[styles.modalMetaText, { color: currentColors.textSecondary }]}>
                            {selectedNotification.time}
                          </Text>
                        </View>
                        
                        <View style={[styles.typeBadge, { 
                          backgroundColor: `${getNotificationColor(selectedNotification.type)}15` 
                        }]}>
                          <Ionicons 
                            name={selectedNotification.icon as any} 
                            size={12} 
                            color={getNotificationColor(selectedNotification.type)} 
                          />
                          <Text style={[styles.typeText, { 
                            color: getNotificationColor(selectedNotification.type) 
                          }]}>
                            {selectedNotification.type.toUpperCase()}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <View style={[styles.modalDivider, { backgroundColor: currentColors.divider }]} />

                    <View style={[styles.modalMessageCard, { 
                      backgroundColor: isDark ? currentColors.card : currentColors.unreadBg 
                    }]}>
                      <Text style={[styles.modalMessage, { color: currentColors.text }]}>
                        {selectedNotification.message}
                      </Text>
                    </View>

                    {selectedNotification.created_at && (
                      <View style={styles.modalInfoSection}>
                        <View style={styles.modalInfoItem}>
                          <Ionicons name="calendar-outline" size={16} color={currentColors.textSecondary} />
                          <Text style={[styles.modalInfoText, { color: currentColors.textSecondary }]}>
                            {new Date(selectedNotification.created_at).toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </Text>
                        </View>
                      </View>
                    )}

                    <View style={styles.modalActions}>
                      {selectedNotification.page && (
                        <TouchableOpacity
                          style={[styles.modalActionButton, { 
                            backgroundColor: currentColors.primary,
                          }]}
                          onPress={() => {
                            closeModal();
                          }}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                          <Text style={styles.modalActionButtonText}>View Details</Text>
                        </TouchableOpacity>
                      )}
                      
                      <TouchableOpacity
                        style={[styles.modalActionButtonSecondary, { 
                          backgroundColor: isDark ? currentColors.card : currentColors.background,
                          borderWidth: 1.5,
                          borderColor: currentColors.border,
                        }]}
                        onPress={closeModal}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.modalActionButtonTextSecondary, { color: currentColors.text }]}>
                          Dismiss
                        </Text>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    paddingBottom: 4,
  },
  backButton: {
    width: 80,
    height: 40,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  backButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 4,
  },
  headerTitleContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: -1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  markAllButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerStats: {
    marginTop: 4,
    marginBottom: 4,
    alignItems: 'center',
  },
  headerStatsText: {
    fontSize: 13,
    fontWeight: '400',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  notificationItemContainer: {
    position: 'relative',
    marginBottom: 1,
    height: 90,
  },
  deleteButtonContainer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: 100,
    justifyContent: 'center',
    alignItems: 'flex-end',
    backgroundColor: '#DC3545',
    paddingRight: 20,
    zIndex: 0,
  },
  deleteButton: {
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationCard: {
    position: 'relative',
    zIndex: 1,
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    marginTop: 2,
  },
  notificationTextContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  notificationTitle: {
    fontSize: 16,
    flex: 1,
    marginRight: 8,
    letterSpacing: 0.2,
  },
  notificationTime: {
    fontSize: 13,
    letterSpacing: 0.1,
  },
  notificationMessage: {
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.1,
  },
  unreadIndicatorContainer: {
    marginLeft: 8,
    justifyContent: 'flex-start',
    marginTop: 4,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  loadingIndicator: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 12,
    letterSpacing: 0.2,
  },
  emptyMessage: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    letterSpacing: 0.1,
  },
  bottomSpacing: {
    height: 40,
  },
  modalOverlay: {
    flex: 1,
  },
  modalOverlayTouchable: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContainer: {
    maxHeight: height * 0.75,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 24,
  },
  modalDragIndicator: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    opacity: 0.3,
  },
  modalContent: {
    paddingHorizontal: 24,
  },
  modalHeader: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  modalIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitleSection: {
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 14,
    letterSpacing: 0.3,
    textAlign: 'center',
    lineHeight: 32,
  },
  modalMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  modalMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modalMetaText: {
    fontSize: 14,
    fontWeight: '500',
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  typeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  modalDivider: {
    height: 1,
    marginVertical: 24,
  },
  modalMessageCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
  },
  modalMessage: {
    fontSize: 16,
    lineHeight: 26,
    letterSpacing: 0.3,
  },
  modalInfoSection: {
    marginBottom: 24,
  },
  modalInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  modalInfoText: {
    fontSize: 14,
    fontWeight: '500',
  },
  modalActions: {
    flexDirection: 'column',
    gap: 12,
  },
  modalActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 10,
  },
  modalActionButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  modalActionButtonSecondary: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  modalActionButtonTextSecondary: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});

export default Notifications;