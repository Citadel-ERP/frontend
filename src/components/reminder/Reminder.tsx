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
import { ReminderProps, ReminderItem, Employee, ViewMode } from './types';
import { 
  getColorValue, formatDateToYYYYMMDD, isDateBeforeToday, 
  getColorName, convertTo24Hour, convertTo12Hour, formatDate, formatTime 
} from './utils';
import BackIcon from './BackIcon';
import Calendar from './calendar';
import NewReminder from './newReminder';
import ReminderInfo from './reminderInfo';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const HOURS_24 = Array.from({ length: 24 }, (_, i) => i);
const HOUR_HEIGHT = 60;

const formatHourLabel = (hour: number) => {
  if (hour === 0) return '12 AM';
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return '12 PM';
  return `${hour - 12} PM`;
};

const Reminder: React.FC<ReminderProps> = ({ onBack }) => {
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

  // Group reminders by hour and minute for better layout
  const getRemindersByHourAndMinute = (hour: number, dayReminders: ReminderItem[]) => {
    const hourReminders = dayReminders.filter(r => {
      const startHour = parseInt(r.reminder_time.split(':')[0]);
      return startHour === hour;
    });

    const groupedByMinute: { [key: string]: ReminderItem[] } = {};
    hourReminders.forEach(reminder => {
      const minute = reminder.reminder_time.split(':')[1];
      if (!groupedByMinute[minute]) {
        groupedByMinute[minute] = [];
      }
      groupedByMinute[minute].push(reminder);
    });

    return groupedByMinute;
  };

  // Day View Component (Timeline) - Updated
  const DayView = () => {
    if (!selectedDate) return null;
    
    const dayReminders = getRemindersForDate(selectedDate);
    
    return (
      <View style={styles.dayViewContainer}>
        <View style={styles.dayViewHeader}>
          <View style={styles.dayViewHeaderRow}>
            <TouchableOpacity 
              onPress={handleBackToCalendar}
              style={styles.backToDayButton}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-back" size={24} color="#fff" />
              <Text style={styles.backToDayText}>Back</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.addDayButton}
              onPress={() => openCreateModalForDate(selectedDate)}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.dayViewDateContainer}>
            <Text style={styles.dayViewWeekday}>
              {selectedDate.toLocaleDateString('en-US', { weekday: 'long' })}
            </Text>
            <Text style={styles.dayViewDate}>
              {selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </Text>
          </View>
        </View>

        <ScrollView 
          style={styles.timelineScroll} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.timelineContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#25D366']}
              tintColor={'#25D366'}
            />
          }
        >
          {dayReminders.length === 0 ? (
            <View style={styles.emptyDayState}>
              <Ionicons name="calendar-outline" size={64} color="#E5E5EA" />
              <Text style={styles.emptyDayTitle}>No Reminders</Text>
              <Text style={styles.emptyDaySubtitle}>
                No reminders scheduled for this date
              </Text>
              <TouchableOpacity
                style={styles.addReminderButtonLarge}
                onPress={() => openCreateModalForDate(selectedDate)}
                activeOpacity={0.8}
              >
                <Ionicons name="add" size={24} color="#fff" />
                <Text style={styles.addReminderButtonTextLarge}>Add Reminder</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.timeline}>
              {HOURS_24.map(hour => {
                const remindersByMinute = getRemindersByHourAndMinute(hour, dayReminders);
                const hasReminders = Object.keys(remindersByMinute).length > 0;

                return (
                  <View key={hour} style={styles.timeSlot}>
                    <Text style={styles.timeLabel}>{formatHourLabel(hour)}</Text>
                    <View style={styles.timeSlotLine} />
                    
                    {hasReminders && Object.entries(remindersByMinute).map(([minute, reminders]) => {
                      const topOffset = (parseInt(minute) / 60) * HOUR_HEIGHT;
                      const reminderCount = reminders.length;
                      
                      const getWidthPercentage = () => {
                        if (reminderCount === 1) return '100%';
                        if (reminderCount === 2) return '49%';
                        if (reminderCount === 3) return '32%';
                        return '24%';
                      };

                      return (
                        <View 
                          key={`${hour}-${minute}`}
                          style={[styles.reminderRow, { top: topOffset }]}
                        >
                          {reminders.slice(0, 4).map((reminder, index) => (
                            <TouchableOpacity
                              key={reminder.id}
                              style={[
                                styles.reminderBlock,
                                {
                                  backgroundColor: getColorValue(reminder.color) + '20',
                                  borderLeftColor: getColorValue(reminder.color),
                                  width: getWidthPercentage(),
                                  marginRight: index < Math.min(reminderCount, 4) - 1 ? 4 : 0,
                                }
                              ]}
                              onPress={() => openDetailModal(reminder)}
                              activeOpacity={0.8}
                            >
                              <View style={styles.reminderBlockContent}>
                                <View style={styles.reminderBlockHeader}>
                                  <Text 
                                    style={[
                                      styles.reminderBlockTitle, 
                                      { color: getColorValue(reminder.color) }
                                    ]}
                                    numberOfLines={reminderCount > 2 ? 1 : 2}
                                  >
                                    {reminder.title}
                                  </Text>
                                  {reminder.is_completed && (
                                    <Ionicons name="checkmark-circle" size={14} color="#25D366" />
                                  )}
                                </View>
                                {reminderCount <= 2 && (
                                  <Text style={styles.reminderBlockTime}>
                                    {formatTime(reminder.reminder_time)}
                                  </Text>
                                )}
                              </View>
                            </TouchableOpacity>
                          ))}
                          {reminders.length > 4 && (
                            <View style={styles.moreIndicator}>
                              <Text style={styles.moreIndicatorText}>
                                +{reminders.length - 4}
                              </Text>
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      </View>
    );
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
                    style={styles.actionButton} 
                    onPress={() => {
                      setSelectedDate(new Date());
                      setShowCreateModal(true);
                    }}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="add" size={20} color="#fff" />
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
              <DayView />
            )}
          </>
        )}
      </View>

      {/* Create/Edit Modal - Fixed onClose to maintain selected date */}
      <NewReminder
        visible={showCreateModal}
        isEditMode={isEditMode}
        token={token}
        selectedReminder={selectedReminder}
        selectedDate={selectedDate || new Date()}
        onClose={() => {
          setShowCreateModal(false);
          resetForm();
          // Don't reset selectedDate here - this was causing the white screen
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
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    minHeight: 32,
    justifyContent: 'center',
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
  
  // Day View Styles - Updated
  dayViewContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  dayViewHeader: {
    backgroundColor: '#075E54',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: 16,
  },
  dayViewHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  backToDayButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backToDayText: {
    fontSize: 16,
    color: '#fff',
    marginLeft: 4,
    fontWeight: '500',
  },
  dayViewDateContainer: {
    marginBottom: 8,
  },
  dayViewWeekday: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dayViewDate: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginTop: 4,
  },
  addDayButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineScroll: {
    flex: 1,
    backgroundColor: '#fff',
  },
  timelineContent: {
    paddingBottom: 100,
  },
  timeline: {
    paddingHorizontal: 8,
  },
  timeSlot: {
    height: HOUR_HEIGHT,
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
    position: 'relative',
  },
  timeLabel: {
    width: 70,
    fontSize: 12,
    color: '#8E8E93',
    paddingTop: 4,
    paddingRight: 12,
    textAlign: 'right',
    fontWeight: '500',
  },
  timeSlotLine: {
    flex: 1,
  },
  reminderRow: {
    position: 'absolute',
    left: 78,
    right: 8,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  reminderBlock: {
    borderLeftWidth: 4,
    borderRadius: 8,
    padding: 10,
    minHeight: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  reminderBlockContent: {
    flex: 1,
  },
  reminderBlockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  reminderBlockTitle: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 16,
    flex: 1,
    marginRight: 4,
  },
  reminderBlockTime: {
    fontSize: 11,
    color: '#8E8E93',
    fontWeight: '500',
    marginTop: 2,
  },
  moreIndicator: {
    width: 40,
    minHeight: 50,
    borderRadius: 6,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  moreIndicatorText: {
    fontSize: 11,
    color: '#8E8E93',
    fontWeight: '600',
  },
  emptyDayState: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 40,
  },
  emptyDayTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginTop: 20,
    marginBottom: 8,
  },
  emptyDaySubtitle: {
    fontSize: 15,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 24,
  },
  addReminderButtonLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#075E54',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  addReminderButtonTextLarge: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default Reminder;