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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BACKEND_URL } from '../config/config';

const { width } = Dimensions.get('window');

// Theme Colors
const lightColors = {
  primary: '#FFFFFF',
  backgroundSecondary: '#F8F9FA',
  text: '#1A1A1A',
  textSecondary: '#666666',
  textLight: '#999999',
  border: '#E5E7EB',
  info: '#3B82F6',
  error: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',
  headerBg: '#007AFF', // Changed to #007AFF
  gradientStart: '#007AFF',
  gradientEnd: '#0056CC',
};

const darkColors = {
  primary: '#000D24',
  backgroundSecondary: '#0C1D33',
  text: '#FFFFFF',
  textSecondary: '#CCCCCC',
  textLight: '#999999',
  border: '#404040',
  info: '#3B82F6',
  error: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',
  headerBg: '#007AFF', // Changed to #007AFF
  gradientStart: '#007AFF',
  gradientEnd: '#0056CC',
};

interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'reminder' | 'attendance' | 'hr' | 'cab' | 'leave' | 'system';
  isRead: boolean;
  icon: string;
  category: 'today' | 'week' | 'earlier';
  page?: string;
  created_at?: string;
}

interface NotificationsProps {
  onBack: () => void;
  isDark?: boolean;
}

// BackIcon component from city.tsx
const BackIcon = () => (
  <View style={styles.backIcon}>
    <View style={styles.backArrow} />
    <Text style={styles.backText}>Back</Text>
  </View>
);

const Notifications: React.FC<NotificationsProps> = ({ onBack, isDark = false }) => {
  const currentColors = isDark ? darkColors : lightColors;
  const theme = {
    bgColor: isDark ? '#050b18' : '#f8f9fa',
    cardBg: isDark ? '#111a2d' : '#ffffff',
    textMain: isDark ? '#ffffff' : '#333333',
    textSub: isDark ? '#a0a0a0' : '#666666',
    accentBlue: isDark ? '#3262f1' : '#007bff',
  };

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);

  useEffect(() => {
    fetchNotifications();
    markAllNotificationsAsRead();
  }, []);

  const markAllNotificationsAsRead = async () => {
    try {
      const token = await AsyncStorage.getItem('token_2');
      if (!token) return;

      await fetch(`${BACKEND_URL}/core/markAllRead`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      // Update local state
      setNotifications(prev =>
        prev.map(notif => ({ ...notif, isRead: true }))
      );
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const fetchNotifications = async () => {
    try {
      const token = await AsyncStorage.getItem('token_2');
      if (!token) return;

      const response = await fetch(`${BACKEND_URL}/core/getNotifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      if (response.ok) {
        const data = await response.json();
        const formattedNotifications = data.notifications.map((notif: any) => 
          formatNotification(notif)
        );
        
        // Sort notifications: unread first, then by time (newest first)
        formattedNotifications.sort((a: Notification, b: Notification) => {
          // First sort by read status (unread first)
          if (a.isRead !== b.isRead) {
            return a.isRead ? 1 : -1;
          }
          // Then sort by time (newest first based on created_at)
          if (a.created_at && b.created_at) {
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          }
          return 0;
        });
        
        setNotifications(formattedNotifications);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
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
      timeText = `${diffMins}m ago`;
      category = 'today';
    } else if (diffHours < 24) {
      timeText = `${diffHours}h ago`;
      category = 'today';
    } else if (diffDays < 7) {
      timeText = `${diffDays}d ago`;
      category = 'week';
    } else {
      timeText = `${Math.floor(diffDays / 7)}w ago`;
      category = 'earlier';
    }

    return {
      id: notif.id.toString(),
      title: notif.title,
      message: notif.message,
      time: timeText,
      type: notif.type || 'info',
      isRead: notif.is_read || false,
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
      reminder: 'notifications',
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
      attendance: '#00d285',
      hr: '#ff5e7a',
      cab: '#ffb157',
      leave: '#1da1f2',
      reminder: '#1da1f2',
      success: currentColors.success,
      warning: currentColors.warning,
      error: currentColors.error,
      info: currentColors.info,
      system: '#6b7cff',
    };
    return colorMap[type] || currentColors.info;
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      const token = await AsyncStorage.getItem('token_2');
      if (!token) return;

      const response = await fetch(`${BACKEND_URL}/core/markNotificationAsRead`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, notification_id: id }),
      });

      if (response.ok) {
        setNotifications(prev =>
          prev.map(notif =>
            notif.id === id ? { ...notif, isRead: true } : notif
          )
        );
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const token = await AsyncStorage.getItem('token_2');
      if (!token) return;

      const response = await fetch(`${BACKEND_URL}/core/deleteNotification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, notification_id: id }),
      });

      if (response.ok) {
        setNotifications(prev => prev.filter(notif => notif.id !== id));
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications().then(() => setRefreshing(false));
  };

  const handleNotificationPress = (notification: Notification) => {
    if (!notification.isRead) {
      handleMarkAsRead(notification.id);
    }
    setSelectedNotification(notification);
    setModalVisible(true);
  };

  const groupedNotifications = {
    today: notifications.filter(n => n.category === 'today'),
    week: notifications.filter(n => n.category === 'week'),
    earlier: notifications.filter(n => n.category === 'earlier'),
  };

  const NotificationCard = ({ notification }: { notification: Notification }) => {
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDeletePress = () => {
      Alert.alert(
        'Delete Notification',
        'Are you sure you want to delete this notification?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => {
              setIsDeleting(true);
              setTimeout(() => handleDelete(notification.id), 200);
            },
          },
        ]
      );
    };

    return (
      <Animated.View
        style={[
          styles.notificationCard,
          {
            backgroundColor: theme.cardBg,
            borderLeftColor: getNotificationColor(notification.type),
            opacity: isDeleting ? 0 : 1,
            transform: [{ scale: isDeleting ? 0.9 : 1 }],
          }
        ]}
      >
        <TouchableOpacity
          style={styles.notificationContent}
          onPress={() => handleNotificationPress(notification)}
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.iconContainer,
              {
                backgroundColor: `${getNotificationColor(notification.type)}20`,
              }
            ]}
          >
            <Ionicons
              name={notification.icon as any}
              size={24}
              color={getNotificationColor(notification.type)}
            />
          </View>

          <View style={styles.notificationTextContainer}>
            <View style={styles.titleRow}>
              <Text
                style={[
                  styles.notificationTitle,
                  {
                    color: theme.textMain,
                    fontWeight: notification.isRead ? '500' : '700',
                  }
                ]}
                numberOfLines={1}
              >
                {notification.title}
              </Text>
              {!notification.isRead && (
                <View
                  style={[
                    styles.unreadDot,
                    { backgroundColor: '#00d285' } // Changed to #00d285
                  ]}
                />
              )}
            </View>
            <Text
              style={[
                styles.notificationMessage,
                { color: theme.textSub }
              ]}
              numberOfLines={2}
            >
              {notification.message}
            </Text>
            <View style={styles.timeContainer}>
              <Ionicons
                name="time-outline"
                size={12}
                color={theme.textSub}
              />
              <Text
                style={[
                  styles.notificationTime,
                  { color: theme.textSub }
                ]}
              >
                {notification.time}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={handleDeletePress}
            style={styles.deleteButton}
          >
            <Ionicons name="close-circle" size={20} color={theme.textSub} />
          </TouchableOpacity>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const SectionHeader = ({ title, count }: { title: string; count: number }) => (
    count > 0 ? (
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: theme.textMain }]}>
          {title}
        </Text>
        <View style={[styles.countBadge, { backgroundColor: theme.accentBlue }]}>
          <Text style={styles.countText}>{count}</Text>
        </View>
      </View>
    ) : null
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.bgColor }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'light-content'}
        backgroundColor={currentColors.headerBg}
      />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: '#007AFF' }]}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            onPress={onBack}
            style={styles.backButton}
          >
            <BackIcon />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notifications</Text>
          {/* Removed the mark all as read button */}
          <View style={styles.placeholderButton} />
        </View>
      </View>

      {/* Notifications List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.accentBlue}
            colors={[theme.accentBlue]}
          />
        }
      >
        {loading ? (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyMessage, { color: theme.textSub }]}>
              Loading notifications...
            </Text>
          </View>
        ) : notifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View
              style={[
                styles.emptyIconContainer,
                { backgroundColor: `${theme.accentBlue}20` }
              ]}
            >
              <Ionicons
                name="notifications-off-outline"
                size={64}
                color={theme.textSub}
              />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.textMain }]}>
              No Notifications
            </Text>
            <Text style={[styles.emptyMessage, { color: theme.textSub }]}>
              You don't have any notifications yet.
            </Text>
          </View>
        ) : (
          <>
            {groupedNotifications.today.length > 0 && (
              <>
                <SectionHeader title="Today" count={groupedNotifications.today.length} />
                {groupedNotifications.today.map(notification => (
                  <NotificationCard key={notification.id} notification={notification} />
                ))}
              </>
            )}

            {groupedNotifications.week.length > 0 && (
              <>
                <SectionHeader title="This Week" count={groupedNotifications.week.length} />
                {groupedNotifications.week.map(notification => (
                  <NotificationCard key={notification.id} notification={notification} />
                ))}
              </>
            )}

            {groupedNotifications.earlier.length > 0 && (
              <>
                <SectionHeader title="Earlier" count={groupedNotifications.earlier.length} />
                {groupedNotifications.earlier.map(notification => (
                  <NotificationCard key={notification.id} notification={notification} />
                ))}
              </>
            )}
          </>
        )}
      </ScrollView>

      {/* Notification Detail Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[
            styles.modalContainer,
            { backgroundColor: theme.cardBg }
          ]}>
            {selectedNotification && (
              <>
                <View style={styles.modalHeader}>
                  <View style={styles.modalIconContainer}>
                    <View
                      style={[
                        styles.modalIconBackground,
                        { backgroundColor: `${getNotificationColor(selectedNotification.type)}20` }
                      ]}
                    >
                      <Ionicons
                        name={selectedNotification.icon as any}
                        size={28}
                        color={getNotificationColor(selectedNotification.type)}
                      />
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.modalCloseButton}
                    onPress={() => setModalVisible(false)}
                  >
                    <Ionicons name="close" size={24} color={theme.textMain} />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalContent}>
                  <Text style={[
                    styles.modalTitle,
                    { color: theme.textMain }
                  ]}>
                    {selectedNotification.title}
                  </Text>
                  
                  <Text style={[
                    styles.modalTime,
                    { color: theme.textSub }
                  ]}>
                    <Ionicons name="time-outline" size={14} color={theme.textSub} />
                    {' '}{selectedNotification.time}
                  </Text>

                  <Text style={[
                    styles.modalMessage,
                    { color: theme.textMain }
                  ]}>
                    {selectedNotification.message}
                  </Text>
                </ScrollView>

                <TouchableOpacity
                  style={[
                    styles.modalButton,
                    { backgroundColor: '#007AFF' }
                  ]}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.modalButtonText}>Close</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 50,
    paddingBottom: 0,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: '700',
  },
  placeholderButton: {
    width: 40,
    height: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  countBadge: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  notificationCard: {
    marginBottom: 12,
    borderRadius: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  notificationContent: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationTextContainer: {
    flex: 1,
    marginRight: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 15,
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
  },
  notificationMessage: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 6,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notificationTime: {
    fontSize: 12,
    marginLeft: 4,
  },
  deleteButton: {
    padding: 4,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  // BackIcon styles from city.tsx
  backIcon: {
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  backArrow: {
    width: 12,
    height: 12,
    borderLeftWidth: 2,
    borderTopWidth: 2,
    borderColor: '#fff',
    transform: [{ rotate: '-45deg' }],
  },
  backText: {
    color: '#fff',
    fontSize: 14,
    marginLeft: 2,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  modalIconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalIconBackground: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseButton: {
    padding: 5,
  },
  modalContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 10,
  },
  modalTime: {
    fontSize: 14,
    marginBottom: 20,
  },
  modalMessage: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 20,
  },
  modalButton: {
    marginHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  modalButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default Notifications;