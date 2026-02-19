import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView,
  StatusBar, Dimensions, ActivityIndicator, Alert, Platform,
  Image, RefreshControl, TextInput
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BACKEND_URL } from '../../config/config';

import { WHATSAPP_COLORS, TOKEN_KEY } from './constants';
import { ReminderItem, Employee, ViewMode } from './types';
import {
  getColorValue, formatDateToYYYYMMDD, isDateBeforeToday,
  getColorName, convertTo24Hour, convertTo12Hour, formatDate, formatTime
} from './utils';
import BackIcon from './BackIcon';
import Calendar from './calendar';
import NewReminder from './newReminder';
import ReminderInfo from './reminderInfo';
import DayView from './dayView';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const HOURS_24 = Array.from({ length: 24 }, (_, i) => i);
const HOUR_HEIGHT = 60;

const formatHourLabel = (hour: number) => {
  if (hour === 0) return '12 AM';
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return '12 PM';
  return `${hour - 12} PM`;
};

// Update ReminderProps interface
interface ReminderProps {
  onBack: () => void;
  onReminderUpdate?: () => Promise<void>;  // Add this
}

const Reminder: React.FC<ReminderProps> = ({ onBack, onReminderUpdate }) => {
  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedReminder, setSelectedReminder] = useState<ReminderItem | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [currentDate, setCurrentDate] = useState(new Date());

  const [newReminderData, setNewReminderData] = useState<any>({
    title: '',
    description: '',
    date: '',
    time: '12:00:00',
    color: '#2196F3',
    employees: [],
    selectedType: '',
    customType: '',
  });

  const insets = useSafeAreaInsets();

  useEffect(() => {
    const getToken = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('token_2');
        setToken(storedToken);
      } catch (error) {
        console.error('Error getting token:', error);
        Alert.alert('Error', 'Failed to retrieve authentication token');
      }
    };
    getToken();
  }, []);

  useEffect(() => {
    if (token) {
      fetchReminders();
    }
  }, [token]);

  const fetchReminders = async () => {
    if (!token) return;

    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/core/getReminders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      const result = await response.json();

      if (response.ok && result.data) {
        setReminders(result.data);
      } else {
        throw new Error(result.message || 'Failed to fetch reminders');
      }
    } catch (error) {
      console.error('Error fetching reminders:', error);
      Alert.alert('Error', 'Failed to load reminders. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchReminders();
  };

  const handleToggleComplete = async (reminderId: number, currentStatus: boolean) => {
    try {
      const response = await fetch(`${BACKEND_URL}/core/markAsCompleted`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          reminder_id: reminderId,
          is_completed: !currentStatus,
        }),
      });

      const result = await response.json();

      if (response.ok && result.data) {
        setReminders(reminders.map(r =>
          r.id === reminderId ? { ...r, is_completed: !currentStatus } : r
        ));
        if (selectedReminder && selectedReminder.id === reminderId) {
          setSelectedReminder({ ...selectedReminder, is_completed: !currentStatus });
        }
      } else {
        throw new Error(result.message || 'Failed to update reminder status');
      }
    } catch (error) {
      console.error('Error updating reminder status:', error);
      Alert.alert('Error', 'Failed to update reminder status. Please try again.');
    }
  };

  // UPDATED: handleCreateReminder with callback
  const handleCreateReminder = async (data: any) => {
    if (isDateBeforeToday(data.date)) {
      Alert.alert('Invalid Date', 'Cannot create reminder for past dates');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/core/createReminder`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          title: data.title,
          description: data.description,
          date: data.date,
          time: data.time,
          employee_ids: data.employees.map((emp: Employee) => emp.employee_id),
          color: data.color,
        }),
      });

      const result = await response.json();

      if (response.ok && result.data) {
        setReminders([...reminders, result.data]);
        Alert.alert('Success', 'Reminder created successfully');
        
        // ✅ Trigger dashboard refresh
        if (onReminderUpdate) {
          console.log('🔄 Calling onReminderUpdate callback...');
          await onReminderUpdate();
        }
        
        // Close the create modal
        setShowCreateModal(false);
        resetForm();
      } else {
        throw new Error(result.message || 'Failed to create reminder');
      }
    } catch (error) {
      console.error('Error creating reminder:', error);
      Alert.alert('Error', 'Failed to create reminder. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // UPDATED: handleUpdateReminder with callback
  const handleUpdateReminder = async (data: any) => {
    if (!selectedReminder) return;

    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/core/updateReminder`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          reminder_id: selectedReminder.id,
          title: data.title,
          description: data.description,
          date: data.date,
          time: data.time,
          employee_ids: data.employees.map((emp: Employee) => emp.employee_id),
          color: data.color,
        }),
      });

      const result = await response.json();

      if (response.ok && result.data) {
        setReminders(reminders.map(r => r.id === selectedReminder.id ? result.data : r));
        setSelectedReminder(result.data);
        Alert.alert('Success', 'Reminder updated successfully');
        
        // ✅ Trigger dashboard refresh
        if (onReminderUpdate) {
          console.log('🔄 Calling onReminderUpdate callback...');
          await onReminderUpdate();
        }
        
        // Close modals
        setShowCreateModal(false);
        setShowDetailModal(false);
        setIsEditMode(false);
        resetForm();
      } else {
        throw new Error(result.message || 'Failed to update reminder');
      }
    } catch (error) {
      console.error('Error updating reminder:', error);
      Alert.alert('Error', 'Failed to update reminder. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteReminder = (reminderId: number) => {
    Alert.alert(
      'Delete Reminder',
      'Are you sure you want to delete this reminder?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`${BACKEND_URL}/core/deleteReminder`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  token,
                  reminder_id: reminderId,
                }),
              });

              const result = await response.json();

              if (response.ok) {
                setReminders(reminders.filter(r => r.id !== reminderId));
                setShowDetailModal(false);
                setSelectedReminder(null);
                Alert.alert('Success', 'Reminder deleted successfully');
                
                // ✅ Trigger dashboard refresh
                if (onReminderUpdate) {
                  console.log('🔄 Calling onReminderUpdate callback after delete...');
                  await onReminderUpdate();
                }
              } else {
                throw new Error(result.message || 'Failed to delete reminder');
              }
            } catch (error) {
              console.error('Error deleting reminder:', error);
              Alert.alert('Error', 'Failed to delete reminder. Please try again.');
            }
          },
        },
      ]
    );
  };

  const openDetailModal = (reminder: ReminderItem) => {
    setSelectedReminder(reminder);
    setShowDetailModal(true);
  };

  const openEditMode = () => {
    if (!selectedReminder) return;

    const time12 = convertTo12Hour(selectedReminder.reminder_time);

    setNewReminderData({
      title: selectedReminder.title,
      description: selectedReminder.description,
      date: selectedReminder.reminder_date.split('T')[0],
      time: selectedReminder.reminder_time,
      color: getColorValue(selectedReminder.color),
      employees: [],
      selectedType: '',
      customType: '',
    });

    setIsEditMode(true);
    setShowDetailModal(false);
    setShowCreateModal(true);
  };

  const openCreateModalForDate = (dateObj: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dateObj.setHours(0, 0, 0, 0);

    if (dateObj < today) {
      Alert.alert('Invalid Date', 'Cannot create reminder for past dates');
      return;
    }

    setNewReminderData({
      ...newReminderData,
      date: formatDateToYYYYMMDD(dateObj),
      color: '#2196F3',
    });
    setSelectedDate(dateObj);
    setShowCreateModal(true);
  };

  const resetForm = () => {
    setNewReminderData({
      title: '',
      description: '',
      date: '',
      time: '12:00:00',
      color: '#2196F3',
      employees: [],
      selectedType: '',
      customType: '',
    });
    setIsEditMode(false);
  };

  const getRemindersForDate = (dateObj: Date) => {
    const dateStr = formatDateToYYYYMMDD(dateObj);
    return reminders.filter(r => r.reminder_date.split('T')[0] === dateStr);
  };

  const changeMonth = (direction: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + direction, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setViewMode('agenda');
  };

  const handleBackToCalendar = () => {
    setSelectedDate(null);
    setViewMode('month');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#2D3748" />

      {/* Only show header when NOT in day view */}
      {viewMode === 'month' && !selectedDate && (
        <View style={[styles.headerBanner, { height: 250 }]}>
          <LinearGradient
            colors={['#4A5568', '#2D3748']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.headerBanner, { height: 250 }]}
          >
            <Image
              source={require('../../assets/bg.jpeg')}
              style={styles.headerImage}
              resizeMode="cover"
            />

            <View style={styles.headerOverlay} />

            <View style={[styles.headerContent, {
              paddingTop: Platform.OS === 'ios' ? 50 : 40
            }]}>
              <View style={styles.headerTopRow}>
                <View style={styles.leftSection}>
                  <TouchableOpacity
                    style={styles.backButton}
                    onPress={onBack}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <BackIcon />
                  </TouchableOpacity>
                </View>

                <View style={styles.centerSection}>
                  <Text style={styles.logoText}>CITADEL</Text>
                </View>

                <View style={styles.rightSection}>
                <TouchableOpacity
                  onPress={() => {
                    setSelectedDate(new Date());
                    setShowCreateModal(true);
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Ionicons name="add" size={18} color="#fff" />
                    <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Add</Text>
                  </View>
                </TouchableOpacity>
              </View>
              </View>
            </View>

            <View style={styles.titleSection}>
              <Text style={styles.sectionTitle}>Reminders</Text>
              <Text style={styles.sectionSubtitle}>
                {reminders.length} reminder{reminders.length !== 1 ? 's' : ''}
              </Text>
            </View>
          </LinearGradient>
        </View>
      )}

      {/* Content Area */}
      <View style={styles.content}>
        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#075E54" />
            <Text style={styles.loadingText}>Loading reminders...</Text>
          </View>
        ) : (
          <>
            {viewMode === 'month' && !selectedDate ? (
              <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    colors={['#25D366']}
                    tintColor={'#25D366'}
                  />
                }
              >
                <Calendar
                  currentDate={currentDate}
                  selectedDate={selectedDate}
                  reminders={reminders}
                  onMonthChange={changeMonth}
                  onDateSelect={handleDateSelect}
                  onDateLongPress={openCreateModalForDate}
                  onTodayPress={goToToday}
                  getRemindersForDate={getRemindersForDate}
                />
              </ScrollView>
            ) : (
              <DayView
                selectedDate={selectedDate}
                reminders={reminders}
                onOpenDetailModal={openDetailModal}
                onCreateReminder={() => openCreateModalForDate(selectedDate!)}
                getRemindersForDate={getRemindersForDate}
                onBackToCalendar={handleBackToCalendar}
                refreshing={refreshing}
                onRefresh={onRefresh}
              />
            )}
          </>
        )}
      </View>

      {/* Create/Edit Modal */}
      <NewReminder
        visible={showCreateModal}
        isEditMode={isEditMode}
        token={token}
        selectedReminder={selectedReminder}
        selectedDate={selectedDate || new Date()}
        onClose={() => {
          setShowCreateModal(false);
          resetForm();
        }}
        onSubmit={handleCreateReminder}
        onEditSubmit={handleUpdateReminder}
      />

      {/* Detail Modal */}
      <ReminderInfo
        visible={showDetailModal}
        reminder={selectedReminder}
        onClose={() => setShowDetailModal(false)}
        onEdit={openEditMode}
        onDelete={handleDeleteReminder}
        onToggleComplete={handleToggleComplete}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  headerBanner: {
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    overflow: 'hidden',
    position: 'relative'
  },
  headerImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    opacity: 0.8,
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  headerContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
    position: 'relative',
    zIndex: 1,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftSection: {
    width: 80,
    alignItems: 'flex-start',
  },
  centerSection: {
    flex: 1,
    alignItems: 'center',
  },
  rightSection: {
    width: 80,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
  },
  logoText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1,
    textAlign: 'center',
  },
  titleSection: {
    paddingHorizontal: 20,
    paddingBottom: 10,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    position: 'relative',
    zIndex: 1,
  },
  sectionTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 300,
  },
  loadingText: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 16,
  },
});

export default Reminder;