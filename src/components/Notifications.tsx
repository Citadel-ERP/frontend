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
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { BACKEND_URL } from '../config/config';

const { width } = Dimensions.get('window');

// WhatsApp Colors
const whatsappColors = {
  dark: {
    background: '#111B21',
    card: '#202C33',
    text: '#E9EDEF',
    textSecondary: '#8696A0',
    textLight: '#667781',
    border: '#2A3942',
    primary: '#008069',
    accent: '#00A884',
    header: '#202C33',
    icon: '#AEBAC1',
    danger: '#F15C6D',
    warning: '#F59E0B',
    unread: '#53BDEB',
  },
  light: {
    background: '#FFFFFF',
    card: '#F0F2F5',
    text: '#111B21',
    textSecondary: '#667781',
    textLight: '#8696A0',
    border: '#E1E8ED',
    primary: '#008069',
    accent: '#00A884',
    header: '#008069',
    icon: '#8696A0',
    danger: '#F15C6D',
    warning: '#F59E0B',
    unread: '#008069',
  }
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

const Notifications: React.FC<NotificationsProps> = ({ onBack, isDark = false }) => {
  const insets = useSafeAreaInsets();
  const currentColors = isDark ? whatsappColors.dark : whatsappColors.light;
  
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
        
        formattedNotifications.sort((a: Notification, b: Notification) => {
          if (a.isRead !== b.isRead) {
            return a.isRead ? 1 : -1;
          }
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
      timeText = createdAt.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
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
      attendance: '#00A884',
      hr: '#FF7B54',
      cab: '#FF9F45',
      leave: '#4D96FF',
      reminder: '#4D96FF',
      success: '#00A884',
      warning: '#FFD93D',
      error: '#FF6B6B',
      info: '#6BCFFF',
      system: '#9D79D6',
    };
    return colorMap[type] || currentColors.accent;
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

  const renderHeader = () => (
    <View style={[styles.header, { 
      backgroundColor: currentColors.header,
      paddingTop: Platform.OS === 'ios' ? insets.top : 10,
    }]}>
      <View style={styles.headerContent}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={onBack}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <TouchableOpacity 
          style={styles.markAllButton}
          onPress={markAllNotificationsAsRead}
          disabled={notifications.every(n => n.isRead)}
        >
          <Ionicons 
            name="checkmark-done" 
            size={22} 
            color={notifications.every(n => n.isRead) ? 'rgba(255,255,255,0.5)' : '#FFFFFF'} 
          />
        </TouchableOpacity>
      </View>
    </View>
  );

  const NotificationCard = ({ notification }: { notification: Notification }) => {
    const notificationColor = getNotificationColor(notification.type);

    return (
      <TouchableOpacity
        style={[
          styles.notificationCard,
          { 
            backgroundColor: currentColors.card,
            borderLeftColor: notificationColor,
          }
        ]}
        onPress={() => handleNotificationPress(notification)}
        activeOpacity={0.7}
      >
        <View style={styles.notificationContent}>
          <View style={[
            styles.iconContainer,
            { backgroundColor: `${notificationColor}15` }
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
                    fontWeight: notification.isRead ? '400' : '500',
                  }
                ]}
                numberOfLines={1}
              >
                {notification.title}
              </Text>
              <Text style={[styles.notificationTime, { color: currentColors.textSecondary }]}>
                {notification.time}
              </Text>
            </View>
            
            <Text
              style={[
                styles.notificationMessage,
                { 
                  color: notification.isRead ? currentColors.textSecondary : currentColors.text,
                }
              ]}
              numberOfLines={2}
            >
              {notification.message}
            </Text>
            
            {!notification.isRead && (
              <View style={styles.unreadIndicator}>
                <View style={[styles.unreadDot, { backgroundColor: currentColors.unread }]} />
                <Text style={[styles.unreadText, { color: currentColors.unread }]}>
                  New
                </Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            onPress={() => {
              Alert.alert(
                'Delete Notification',
                'Are you sure you want to delete this notification?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => handleDelete(notification.id),
                  },
                ]
              );
            }}
            style={styles.deleteButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={18} color={currentColors.textSecondary} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const SectionHeader = ({ title, count }: { title: string; count: number }) => (
    count > 0 ? (
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: currentColors.textSecondary }]}>
          {title}
        </Text>
        <View style={[styles.countBadge, { backgroundColor: currentColors.textSecondary + '20' }]}>
          <Text style={[styles.countText, { color: currentColors.textSecondary }]}>{count}</Text>
        </View>
      </View>
    ) : null
  );

  const groupedNotifications = {
    today: notifications.filter(n => n.category === 'today'),
    week: notifications.filter(n => n.category === 'week'),
    earlier: notifications.filter(n => n.category === 'earlier'),
  };

  return (
    <View style={[styles.container, { backgroundColor: currentColors.background }]}>
      <StatusBar 
        barStyle="light-content" 
        backgroundColor={currentColors.header} 
      />
      
      {/* Header */}
      {renderHeader()}
      
      {/* Main Content */}
      <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={currentColors.accent}
              colors={[currentColors.accent]}
            />
          }
        >
          {loading ? (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyMessage, { color: currentColors.textSecondary }]}>
                Loading notifications...
              </Text>
            </View>
          ) : notifications.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View
                style={[
                  styles.emptyIconContainer,
                  { backgroundColor: currentColors.card }
                ]}
              >
                <Ionicons
                  name="notifications-off-outline"
                  size={48}
                  color={currentColors.textSecondary}
                />
              </View>
              <Text style={[styles.emptyTitle, { color: currentColors.text }]}>
                No notifications
              </Text>
              <Text style={[styles.emptyMessage, { color: currentColors.textSecondary }]}>
                When you get notifications, they'll appear here
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
          
          <View style={styles.bottomSpacing} />
        </ScrollView>
      </SafeAreaView>

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
            { backgroundColor: currentColors.background }
          ]}>
            {/* Modal Header */}
            <View style={[styles.modalHeader, { backgroundColor: currentColors.card }]}>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setModalVisible(false)}
              >
                <Ionicons name="close" size={24} color={currentColors.text} />
              </TouchableOpacity>
              <Text style={[styles.modalHeaderTitle, { color: currentColors.text }]}>
                Notification
              </Text>
              <View style={styles.modalHeaderSpacer} />
            </View>

            {selectedNotification && (
              <ScrollView style={styles.modalContent}>
                <View style={styles.modalIconRow}>
                  <View
                    style={[
                      styles.modalIconContainer,
                      { backgroundColor: `${getNotificationColor(selectedNotification.type)}15` }
                    ]}
                  >
                    <Ionicons
                      name={selectedNotification.icon as any}
                      size={28}
                      color={getNotificationColor(selectedNotification.type)}
                    />
                  </View>
                  <View style={styles.modalTitleContainer}>
                    <Text style={[styles.modalTitle, { color: currentColors.text }]}>
                      {selectedNotification.title}
                    </Text>
                    <View style={styles.modalTimeRow}>
                      <Ionicons name="time-outline" size={14} color={currentColors.textSecondary} />
                      <Text style={[styles.modalTime, { color: currentColors.textSecondary }]}>
                        {selectedNotification.time}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={[styles.modalMessageContainer, { backgroundColor: currentColors.card }]}>
                  <Text style={[styles.modalMessage, { color: currentColors.text }]}>
                    {selectedNotification.message}
                  </Text>
                </View>

                <View style={styles.modalActions}>
                  {selectedNotification.page && (
                    <TouchableOpacity
                      style={[styles.modalActionButton, { backgroundColor: currentColors.primary }]}
                      onPress={() => {
                        setModalVisible(false);
                        // Navigate to the page if needed
                      }}
                    >
                      <Text style={styles.modalActionButtonText}>Open</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[styles.modalActionButton, { backgroundColor: currentColors.card }]}
                    onPress={() => setModalVisible(false)}
                  >
                    <Text style={[styles.modalActionButtonText, { color: currentColors.text }]}>
                      Close
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
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
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 16,
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
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  backText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    marginLeft: -40,
  },
  markAllButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  countBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  countText: {
    fontSize: 12,
    fontWeight: '600',
  },
  notificationCard: {
    borderRadius: 10,
    marginBottom: 8,
    borderLeftWidth: 4,
    overflow: 'hidden',
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  notificationTextContainer: {
    flex: 1,
    marginRight: 8,
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
  },
  notificationTime: {
    fontSize: 12,
    marginTop: 2,
  },
  notificationMessage: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  unreadIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  unreadText: {
    fontSize: 12,
    fontWeight: '500',
  },
  deleteButton: {
    padding: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 40,
  },
  bottomSpacing: {
    height: 20,
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
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalHeaderTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalHeaderSpacer: {
    width: 40,
  },
  modalContent: {
    padding: 16,
  },
  modalIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  modalTitleContainer: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  modalTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalTime: {
    fontSize: 14,
    marginLeft: 6,
  },
  modalMessageContainer: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  modalMessage: {
    fontSize: 16,
    lineHeight: 24,
  },
  modalActions: {
    gap: 12,
  },
  modalActionButton: {
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalActionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default Notifications;