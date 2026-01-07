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
  PanResponder,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { BACKEND_URL } from '../config/config';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width, height } = Dimensions.get('window');

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
    green: '#00A884',
    greenLight: '#008069',
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
    green: '#00A884',
    greenLight: '#008069',
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
  const [swipedItem, setSwipedItem] = useState<string | null>(null);
  const [activeSwipe, setActiveSwipe] = useState<string | null>(null);

  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const modalAnim = useRef(new Animated.Value(height)).current;

  useEffect(() => {
    fetchNotifications();
    markAllNotificationsAsRead();
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
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

      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
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
      hr: '#7C3AED',
      cab: '#F59E0B',
      leave: '#3B82F6',
      reminder: '#8B5CF6',
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
      info: '#3B82F6',
      system: '#6B7280',
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
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
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
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setNotifications(prev => prev.filter(notif => notif.id !== id));
        setSwipedItem(null);
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
    Animated.timing(modalAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const closeModal = () => {
    Animated.timing(modalAnim, {
      toValue: height,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setModalVisible(false);
      modalAnim.setValue(height);
    });
  };

  const renderHeader = () => (
    <Animated.View style={[styles.header, { 
      backgroundColor: currentColors.header,
      paddingTop: Platform.OS === 'ios' ? insets.top : StatusBar.currentHeight,
      transform: [{ translateY: slideAnim }],
    }]}>
      <View style={styles.headerContent}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={onBack}
          activeOpacity={0.6}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <TouchableOpacity 
          style={[styles.markAllButton, {
            opacity: notifications.every(n => n.isRead) ? 0.5 : 1
          }]}
          onPress={markAllNotificationsAsRead}
          disabled={notifications.every(n => n.isRead)}
        >
          <Ionicons 
            name="checkmark-done" 
            size={22} 
            color="#FFFFFF" 
          />
        </TouchableOpacity>
      </View>
      {notifications.length > 0 && (
        <View style={styles.headerStats}>
          <Text style={styles.headerStatsText}>
            {notifications.filter(n => !n.isRead).length} unread • {notifications.length} total
          </Text>
        </View>
      )}
    </Animated.View>
  );

  const SwipeableNotification = ({ notification }: { notification: Notification }) => {
    const swipeX = useRef(new Animated.Value(0)).current;
    const notificationColor = getNotificationColor(notification.type);
    
    const panResponder = PanResponder.create({
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx < 0) {
          swipeX.setValue(gestureState.dx);
          setActiveSwipe(notification.id);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < -100) {
          Animated.timing(swipeX, {
            toValue: -width,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            handleDelete(notification.id);
          });
        } else {
          Animated.spring(swipeX, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
          setActiveSwipe(null);
        }
      },
    });

    return (
      <Animated.View 
        style={[
          styles.swipeContainer,
          {
            transform: [{ translateX: swipeX }],
            opacity: swipeX.interpolate({
              inputRange: [-width, 0],
              outputRange: [0, 1],
            }),
          }
        ]}
      >
        <View style={styles.deleteSwipeBackground}>
          <Ionicons name="trash" size={24} color="#FFFFFF" />
          <Text style={styles.deleteSwipeText}>Delete</Text>
        </View>
        
        <Animated.View 
          style={styles.swipeContent}
          {...panResponder.panHandlers}
        >
          <TouchableOpacity
            style={[
              styles.notificationCard,
              { 
                backgroundColor: currentColors.card,
                borderLeftWidth: 4,
                borderLeftColor: notificationColor,
                opacity: activeSwipe === notification.id ? 0.8 : 1,
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
                  size={20}
                  color={notificationColor}
                />
              </View>

              <View style={styles.notificationTextContainer}>
                <View style={styles.titleRow}>
                  <View style={styles.titleContainer}>
                    <Text
                      style={[
                        styles.notificationTitle,
                        { 
                          color: currentColors.text,
                          fontWeight: notification.isRead ? '400' : '600',
                        }
                      ]}
                      numberOfLines={1}
                    >
                      {notification.title}
                    </Text>
                    {!notification.isRead && (
                      <View style={[styles.unreadDot, { backgroundColor: currentColors.green }]} />
                    )}
                  </View>
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
              </View>

              <TouchableOpacity
                style={styles.chevronButton}
                onPress={() => handleNotificationPress(notification)}
              >
                <Ionicons name="chevron-forward" size={20} color={currentColors.textSecondary} />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    );
  };

  const SectionHeader = ({ title, count }: { title: string; count: number }) => (
    count > 0 ? (
      <Animated.View 
        style={[
          styles.sectionHeader,
          {
            opacity: fadeAnim,
            transform: [{
              translateY: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0],
              }),
            }],
          }
        ]}
      >
        <Text style={[styles.sectionTitle, { color: currentColors.textSecondary }]}>
          {title}
        </Text>
        <View style={[styles.countBadge, { backgroundColor: currentColors.green + '20' }]}>
          <Text style={[styles.countText, { color: currentColors.green }]}>{count}</Text>
        </View>
      </Animated.View>
    ) : null
  );

  const groupedNotifications = {
    today: notifications.filter(n => n.category === 'today'),
    week: notifications.filter(n => n.category === 'week'),
    earlier: notifications.filter(n => n.category === 'earlier'),
  };

  return (
    <Animated.View style={[styles.container, { 
      backgroundColor: currentColors.background,
      opacity: fadeAnim,
    }]}>
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
              tintColor={currentColors.green}
              colors={[currentColors.green]}
              progressBackgroundColor={currentColors.background}
            />
          }
        >
          {loading ? (
            <View style={styles.emptyContainer}>
              <View style={styles.loadingIndicator}>
                <Ionicons name="notifications" size={48} color={currentColors.green} />
                <Text style={[styles.emptyMessage, { color: currentColors.textSecondary, marginTop: 16 }]}>
                  Loading notifications...
                </Text>
              </View>
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
                No notifications yet
              </Text>
              <Text style={[styles.emptyMessage, { color: currentColors.textSecondary }]}>
                When you receive notifications, they'll appear here
              </Text>
              <TouchableOpacity
                style={[styles.refreshButton, { backgroundColor: currentColors.green }]}
                onPress={onRefresh}
              >
                <Ionicons name="refresh" size={20} color="#FFFFFF" />
                <Text style={styles.refreshButtonText}>Refresh</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {groupedNotifications.today.length > 0 && (
                <>
                  <SectionHeader title="Today" count={groupedNotifications.today.length} />
                  {groupedNotifications.today.map(notification => (
                    <SwipeableNotification key={notification.id} notification={notification} />
                  ))}
                </>
              )}

              {groupedNotifications.week.length > 0 && (
                <>
                  <SectionHeader title="This Week" count={groupedNotifications.week.length} />
                  {groupedNotifications.week.map(notification => (
                    <SwipeableNotification key={notification.id} notification={notification} />
                  ))}
                </>
              )}

              {groupedNotifications.earlier.length > 0 && (
                <>
                  <SectionHeader title="Earlier" count={groupedNotifications.earlier.length} />
                  {groupedNotifications.earlier.map(notification => (
                    <SwipeableNotification key={notification.id} notification={notification} />
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
        animationType="none"
        transparent={true}
        visible={modalVisible}
        onRequestClose={closeModal}
        statusBarTranslucent
      >
        <Animated.View style={[styles.modalOverlay, {
          transform: [{ translateY: modalAnim }],
        }]}>
          <View style={[
            styles.modalContainer,
            { backgroundColor: currentColors.background }
          ]}>
            {/* Modal Header */}
            <View style={[styles.modalHeader, { 
              backgroundColor: currentColors.card,
              paddingTop: insets.top,
            }]}>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={closeModal}
                activeOpacity={0.6}
              >
                <Ionicons name="close" size={24} color={currentColors.text} />
              </TouchableOpacity>
              <Text style={[styles.modalHeaderTitle, { color: currentColors.text }]}>
                Notification Details
              </Text>
              <View style={styles.modalHeaderSpacer} />
            </View>

            {selectedNotification && (
              <ScrollView 
                style={styles.modalContent}
                showsVerticalScrollIndicator={false}
                bounces={false}
              >
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
                      <Ionicons name="time-outline" size={16} color={currentColors.textSecondary} />
                      <Text style={[styles.modalTime, { color: currentColors.textSecondary }]}>
                        {selectedNotification.time}
                      </Text>
                      <View style={[styles.typeBadge, { 
                        backgroundColor: `${getNotificationColor(selectedNotification.type)}20` 
                      }]}>
                        <Text style={[styles.typeText, { 
                          color: getNotificationColor(selectedNotification.type) 
                        }]}>
                          {selectedNotification.type.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                <View style={[styles.modalDivider, { backgroundColor: currentColors.border }]} />

                <View style={[styles.modalMessageContainer]}>
                  <Text style={[styles.modalMessage, { color: currentColors.text }]}>
                    {selectedNotification.message}
                  </Text>
                </View>

                <View style={styles.modalActions}>
                  {selectedNotification.page && (
                    <TouchableOpacity
                      style={[styles.modalActionButton, { 
                        backgroundColor: currentColors.green,
                        flex: 1,
                      }]}
                      onPress={() => {
                        closeModal();
                        // Navigate to the page if needed
                      }}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="open-outline" size={20} color="#FFFFFF" />
                      <Text style={styles.modalActionButtonText}>Open Link</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[styles.modalActionButton, { 
                      backgroundColor: currentColors.card,
                      flex: 1,
                      marginLeft: 12,
                    }]}
                    onPress={closeModal}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="close" size={20} color={currentColors.text} />
                    <Text style={[styles.modalActionButtonText, { color: currentColors.text }]}>
                      Close
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </Animated.View>
      </Modal>
    </Animated.View>
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
    zIndex: 1000,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  backText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    marginLeft: 6,
  },
  headerTitle: {
    flex: 1,
    fontSize: 22,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    marginLeft: -40,
  },
  markAllButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerStats: {
    marginTop: 8,
  },
  headerStatsText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
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
    marginTop: 24,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
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
  swipeContainer: {
    position: 'relative',
    marginBottom: 8,
    borderRadius: 10,
    overflow: 'hidden',
  },
  deleteSwipeBackground: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: width,
    backgroundColor: '#EF4444',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
  },
  deleteSwipeText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  swipeContent: {
    backgroundColor: 'transparent',
  },
  notificationCard: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
    marginBottom: 8,
  },
  titleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  notificationTitle: {
    fontSize: 16,
    flex: 1,
    marginRight: 8,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  notificationTime: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  notificationMessage: {
    fontSize: 14,
    lineHeight: 20,
  },
  chevronButton: {
    padding: 4,
    marginLeft: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  loadingIndicator: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
  },
  emptyMessage: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    marginTop: 8,
  },
  refreshButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  bottomSpacing: {
    height: 30,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  modalContainer: {
    flex: 1,
    marginTop: 100,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
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
    padding: 24,
  },
  modalIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
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
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  modalTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  modalTime: {
    fontSize: 14,
    marginLeft: 6,
    marginRight: 12,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  typeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  modalDivider: {
    height: 1,
    marginVertical: 20,
  },
  modalMessageContainer: {
    marginBottom: 32,
  },
  modalMessage: {
    fontSize: 16,
    lineHeight: 24,
  },
  modalActions: {
    flexDirection: 'row',
    marginTop: 8,
  },
  modalActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  modalActionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
});

export default Notifications;