import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView,
  StatusBar, Modal, TextInput, Dimensions, ActivityIndicator, Alert, Platform,
  Image, RefreshControl
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BACKEND_URL } from '../config/config';
const TOKEN_KEY = 'token_2';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// WhatsApp Color Theme (same as Employee file)
const WHATSAPP_COLORS = {
  primary: '#075E54', // WhatsApp dark green
  primaryLight: '#128C7E', // WhatsApp medium green
  accent: '#25D366', // WhatsApp light green
  background: '#ECE5DD', // WhatsApp chat background
  surface: '#FFFFFF', // White for cards
  chatBubbleSent: '#DCF8C6', // WhatsApp sent message bubble
  chatBubbleReceived: '#FFFFFF', // WhatsApp received message bubble
  textPrimary: '#000000', // Black for primary text
  textSecondary: '#667781', // WhatsApp secondary text
  textTertiary: '#8696A0', // WhatsApp tertiary text
  border: '#E0E0E0', // Light gray border
  statusOnline: '#25D366', // Online status green
  statusAway: '#FFB300', // Away status yellow
  statusOffline: '#9E9E9E', // Offline gray
  error: '#FF3B30', // Red for errors
  success: '#34C759', // Green for success
  warning: '#FF9500', // Orange for warnings
};

// Custom BackIcon Component (from BUP header)
const BackIcon = () => (
  <View style={styles.backIcon}>
    <View style={styles.backArrow} />
    <Text style={styles.backText}>Back</Text>
  </View>
);

interface ReminderProps {
  onBack: () => void;
}

interface Employee {
  employee_id: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  role: string;
  profile_picture: string | null;
}

interface ReminderItem {
  id: number;
  title: string;
  description: string;
  reminder_date: string;
  reminder_time: string;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
  also_share_with: string[];
  color: string | null;
  created_by: number;
}

type ViewMode = 'month' | 'agenda';

const reminderTypes = [
  { label: 'Meeting', value: 'meeting', icon: '👥' },
  { label: 'Call', value: 'call', icon: '📞' },
  { label: 'Task', value: 'task', icon: '✓' },
  { label: 'Event', value: 'event', icon: '📅' },
  { label: 'Follow-up', value: 'followup', icon: '🔄' },
  { label: 'Deadline', value: 'deadline', icon: '⏰' },
  { label: 'Other', value: 'other', icon: '📝' },
];

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
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [selectedHour, setSelectedHour] = useState('12');
  const [selectedMinute, setSelectedMinute] = useState('00');
  const [selectedPeriod, setSelectedPeriod] = useState('AM');
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  const [selectedType, setSelectedType] = useState('');
  const [customType, setCustomType] = useState('');
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);

  const [selectedEmployees, setSelectedEmployees] = useState<Employee[]>([]);
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState('');
  const [employeeSearchResults, setEmployeeSearchResults] = useState<Employee[]>([]);
  const [showEmployeeSearch, setShowEmployeeSearch] = useState(false);
  const [searchingEmployees, setSearchingEmployees] = useState(false);

  const hours = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'));
  const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0')).filter((_, i) => i % 5 === 0);
  const periods = ['AM', 'PM'];
  
  const eventColors = [
    { name: 'blue', value: '#2196F3' },
    { name: 'green', value: '#4CAF50' },
    { name: 'orange', value: '#FF9800' },
    { name: 'purple', value: '#9C27B0' },
    { name: 'pink', value: '#E91E63' },
    { name: 'yellow', value: '#FFC107' },
  ];

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

  const searchEmployees = async (query: string) => {
    if (!query.trim() || !token) {
      setEmployeeSearchResults([]);
      return;
    }

    setSearchingEmployees(true);
    try {
      const response = await fetch(`${BACKEND_URL}/core/getUsers?query=${encodeURIComponent(query)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      
      if (response.ok && result.data) {
        const filtered = result.data.filter(
          (emp: Employee) => !selectedEmployees.some(sel => sel.employee_id === emp.employee_id)
        );
        setEmployeeSearchResults(filtered);
      }
    } catch (error) {
      console.error('Error searching employees:', error);
    } finally {
      setSearchingEmployees(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (showEmployeeSearch) {
        searchEmployees(employeeSearchQuery);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [employeeSearchQuery, showEmployeeSearch]);

  const addEmployee = (employee: Employee) => {
    setSelectedEmployees([...selectedEmployees, employee]);
    setEmployeeSearchQuery('');
    setEmployeeSearchResults([]);
    setShowEmployeeSearch(false);
  };

  const removeEmployee = (employeeId: string) => {
    setSelectedEmployees(selectedEmployees.filter(emp => emp.employee_id !== employeeId));
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setDate('');
    setSelectedHour('12');
    setSelectedMinute('00');
    setSelectedPeriod('AM');
    setSelectedColor('#2196F3');
    setSelectedDate(null);
    setShowTimePicker(false);
    setSelectedEmployees([]);
    setEmployeeSearchQuery('');
    setEmployeeSearchResults([]);
    setShowEmployeeSearch(false);
    setIsEditMode(false);
    setSelectedType('');
    setCustomType('');
    setShowTypeDropdown(false);
  };

  const isDateBeforeToday = (dateStr: string): boolean => {
    const selectedDate = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    selectedDate.setHours(0, 0, 0, 0);
    return selectedDate < today;
  };

  const getColorName = (colorValue: string): string => {
    const colorObj = eventColors.find(c => c.value === colorValue);
    return colorObj ? colorObj.name : 'blue';
  };

  const getColorValue = (colorName: string | null): string => {
    if (!colorName) return '#2196F3';
    const colorObj = eventColors.find(c => c.name === colorName);
    return colorObj ? colorObj.value : '#2196F3';
  };

  const convertTo24Hour = (hour: string, period: string): string => {
    let hourNum = parseInt(hour);
    if (period === 'PM' && hourNum !== 12) {
      hourNum += 12;
    } else if (period === 'AM' && hourNum === 12) {
      hourNum = 0;
    }
    return hourNum.toString().padStart(2, '0');
  };

  const convertTo12Hour = (time24: string): { hour: string; minute: string; period: string } => {
    const [hours, minutes] = time24.split(':');
    let hourNum = parseInt(hours);
    const period = hourNum >= 12 ? 'PM' : 'AM';
    
    if (hourNum === 0) {
      hourNum = 12;
    } else if (hourNum > 12) {
      hourNum -= 12;
    }
    
    return {
      hour: hourNum.toString().padStart(2, '0'),
      minute: minutes,
      period
    };
  };

  const getDisplayTitle = () => {
    if (selectedType === 'other' && customType.trim()) {
      return customType.trim();
    }
    if (selectedType) {
      const typeObj = reminderTypes.find(t => t.value === selectedType);
      return typeObj ? typeObj.label : '';
    }
    return '';
  };

  const handleToggleComplete = async (reminderId: number, currentStatus: boolean) => {
    try {
      const response = await fetch(`${BACKEND_URL}/core/updateReminderStatus`, {
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

  const handleCreateReminder = async () => {
    const finalTitle = title.trim() || getDisplayTitle();
    
    if (!finalTitle) {
      Alert.alert('Required Field', 'Please enter a title or select a type for your reminder');
      return;
    }
    if (!date) {
      Alert.alert('Required Field', 'Please select a date');
      return;
    }
    if (!selectedColor) {
      Alert.alert('Required Field', 'Please select a color for your reminder');
      return;
    }
    if (isDateBeforeToday(date)) {
      Alert.alert('Invalid Date', 'Cannot create reminder for past dates');
      return;
    }

    const hour24 = convertTo24Hour(selectedHour, selectedPeriod);
    const timeString = `${hour24}:${selectedMinute}:00`;
    const employeeIds = selectedEmployees.map(emp => emp.employee_id);

    setSubmitting(true);
    try {
      const response = await fetch(`${BACKEND_URL}/core/createReminder`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          title: finalTitle,
          description: description.trim(),
          date,
          time: timeString,
          employee_ids: employeeIds,
          color: getColorName(selectedColor),
        }),
      });

      const result = await response.json();

      if (response.ok && result.data) {
        setReminders([...reminders, result.data]);
        setShowCreateModal(false);
        resetForm();
        Alert.alert('Success', 'Reminder created successfully');
      } else {
        throw new Error(result.message || 'Failed to create reminder');
      }
    } catch (error) {
      console.error('Error creating reminder:', error);
      Alert.alert('Error', 'Failed to create reminder. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateReminder = async () => {
    const finalTitle = title.trim() || getDisplayTitle();
    
    if (!selectedReminder || !finalTitle || !date || !selectedColor) {
      Alert.alert('Required Fields', 'Please fill all required fields');
      return;
    }

    const hour24 = convertTo24Hour(selectedHour, selectedPeriod);
    const timeString = `${hour24}:${selectedMinute}:00`;
    const employeeIds = selectedEmployees.map(emp => emp.employee_id);

    setSubmitting(true);
    try {
      const response = await fetch(`${BACKEND_URL}/core/updateReminder`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          reminder_id: selectedReminder.id,
          title: finalTitle,
          description: description.trim(),
          date,
          time: timeString,
          employee_ids: employeeIds,
          color: getColorName(selectedColor),
        }),
      });

      const result = await response.json();

      if (response.ok && result.data) {
        setReminders(reminders.map(r => r.id === selectedReminder.id ? result.data : r));
        setSelectedReminder(result.data);
        setShowCreateModal(false);
        setShowDetailModal(false);
        resetForm();
        Alert.alert('Success', 'Reminder updated successfully');
      } else {
        throw new Error(result.message || 'Failed to update reminder');
      }
    } catch (error) {
      console.error('Error updating reminder:', error);
      Alert.alert('Error', 'Failed to update reminder. Please try again.');
    } finally {
      setSubmitting(false);
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
    
    setTitle(selectedReminder.title);
    setDescription(selectedReminder.description);
    setDate(selectedReminder.reminder_date.split('T')[0]);
    
    const time12 = convertTo12Hour(selectedReminder.reminder_time);
    setSelectedHour(time12.hour);
    setSelectedMinute(time12.minute);
    setSelectedPeriod(time12.period);
    
    setSelectedColor(getColorValue(selectedReminder.color));
    
    setIsEditMode(true);
    setShowDetailModal(false);
    setShowCreateModal(true);
  };

  const formatDateToYYYYMMDD = (dateObj: Date): string => {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const openCreateModalForDate = (dateObj: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dateObj.setHours(0, 0, 0, 0);
    
    if (dateObj < today) {
      Alert.alert('Invalid Date', 'Cannot create reminder for past dates');
      return;
    }
    setSelectedColor('#2196F3');
    setSelectedDate(dateObj);
    setDate(formatDateToYYYYMMDD(dateObj));
    setShowCreateModal(true);
  };

  // Fixed: Handle invalid dates properly
  const formatDate = (dateString: string): string => {
    if (!dateString) return 'Invalid Date';
    
    try {
      // Handle both "YYYY-MM-DD" and "YYYY-MM-DDTHH:mm:ss" formats
      const datePart = dateString.split('T')[0];
      const [year, month, day] = datePart.split('-').map(Number);
      
      // Validate the date
      if (isNaN(year) || isNaN(month) || isNaN(day) || month < 1 || month > 12 || day < 1 || day > 31) {
        return 'Invalid Date';
      }
      
      const d = new Date(year, month - 1, day);
      
      // Check if date is valid
      if (isNaN(d.getTime())) {
        return 'Invalid Date';
      }
      
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const formatTime = (timeString: string): string => {
    const time12 = convertTo12Hour(timeString);
    return `${time12.hour}:${time12.minute} ${time12.period}`;
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    return { daysInMonth, startingDayOfWeek, year, month };
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

  const filteredReminders = reminders.filter(reminder =>
    reminder.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    reminder.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Helper functions for calendar
  const getMonthName = (month: number): string => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return months[month];
  };

  const renderCalendar = () => {
    const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentDate);
    const days = [];
    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    // Empty days for start of month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(<View key={`empty-${i}`} style={styles.calendarDay} />);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dayReminders = getRemindersForDate(date);
      const isToday = day === currentDay && month === currentMonth && year === currentYear;
      const isPast = date < new Date(today.getFullYear(), today.getMonth(), today.getDate());

      let backgroundColor = '#FFFFFF';
      let textColor = WHATSAPP_COLORS.textPrimary;
      let borderColor = WHATSAPP_COLORS.border;
      
      // If there are reminders for this day, use the first reminder's color
      if (dayReminders.length > 0) {
        const firstReminder = dayReminders[0];
        backgroundColor = getColorValue(firstReminder.color) + '15'; // Add transparency
        textColor = getColorValue(firstReminder.color);
        borderColor = getColorValue(firstReminder.color);
      } else if (isToday) {
        backgroundColor = WHATSAPP_COLORS.accent + '20';
        textColor = WHATSAPP_COLORS.primary;
        borderColor = WHATSAPP_COLORS.accent;
      }

      days.push(
        <TouchableOpacity
          key={day}
          style={styles.calendarDay}
          onPress={() => {
            const dayReminders = getRemindersForDate(date);
            if (dayReminders.length > 0) {
              setSelectedDate(date);
              setViewMode('agenda');
            } else {
              openCreateModalForDate(date);
            }
          }}
          onLongPress={() => openCreateModalForDate(date)}
          activeOpacity={0.7}
        >
          <View style={[
            styles.dayCircle,
            { backgroundColor, borderColor },
            isToday && styles.todayCircle
          ]}>
            <Text style={[styles.dayText, { color: textColor }, isPast && styles.dayNumberPast]}>
              {day}
            </Text>
            {dayReminders.length > 0 && (
              <View style={styles.dayEventsIndicator}>
                <View style={[styles.dayEventDot, { backgroundColor: textColor }]} />
                {dayReminders.length > 1 && (
                  <Text style={[styles.dayEventCount, { color: textColor }]}>
                    +{dayReminders.length - 1}
                  </Text>
                )}
              </View>
            )}
          </View>
        </TouchableOpacity>
      );
    }

    return (
      <View style={styles.calendarContainer}>
        <View style={styles.weekDays}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <Text key={day} style={styles.weekDayText}>{day}</Text>
          ))}
        </View>
        
        <View style={styles.calendarGrid}>
          {days}
        </View>
      </View>
    );
  };

  // Redesigned Agenda View
  const AgendaView = () => {
    let displayReminders = filteredReminders;

    if (selectedDate) {
      const selectedDateStr = formatDateToYYYYMMDD(selectedDate);
      displayReminders = filteredReminders.filter(r => r.reminder_date.split('T')[0] === selectedDateStr);
    } else if (viewMode === 'agenda') {
      // Filter by current month when no specific date is selected
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      
      displayReminders = filteredReminders.filter(r => {
        const reminderDate = new Date(r.reminder_date);
        return reminderDate.getFullYear() === year && reminderDate.getMonth() === month;
      });
    }

    const sortedReminders = [...displayReminders].sort((a, b) => {
      const dateA = new Date(`${a.reminder_date.split('T')[0]}T${a.reminder_time}`);
      const dateB = new Date(`${b.reminder_date.split('T')[0]}T${b.reminder_time}`);
      return dateA.getTime() - dateB.getTime();
    });

    const groupedReminders: { [key: string]: ReminderItem[] } = {};
    sortedReminders.forEach(reminder => {
      const dateKey = reminder.reminder_date.split('T')[0];
      if (!groupedReminders[dateKey]) {
        groupedReminders[dateKey] = [];
      }
      groupedReminders[dateKey].push(reminder);
    });

    // If a specific date is selected, show a special header
    if (selectedDate) {
      return (
        <View style={styles.agendaView}>
          {/* Special Header for Selected Date */}
          <View style={styles.selectedDateHeaderContainer}>
            <LinearGradient
              colors={['#4A5568', '#2D3748']}
              style={styles.selectedDateHeader}
            >
              {/* <TouchableOpacity
                style={styles.backButtonContainer}
                onPress={() => {
                  setSelectedDate(null);
                  setViewMode('agenda');
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="arrow-back" size={24} color="#fff" />
                <Text style={styles.backButtonText}>Back to Agenda</Text>
              </TouchableOpacity> */}
              
              <View style={styles.selectedDateContent}>
                <Text style={styles.selectedDateDay}>
                  {selectedDate.getDate()}
                </Text>
                <View>
                  <Text style={styles.selectedDateMonth}>
                    {selectedDate.toLocaleDateString('en-US', { month: 'long' })}
                  </Text>
                  <Text style={styles.selectedDateYear}>
                    {selectedDate.getFullYear()}
                  </Text>
                </View>
              </View>
              
              <Text style={styles.selectedDateRemindersCount}>
                {sortedReminders.length} reminder{sortedReminders.length !== 1 ? 's' : ''}
              </Text>
            </LinearGradient>
          </View>

          <ScrollView 
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[WHATSAPP_COLORS.accent]}
                tintColor={WHATSAPP_COLORS.accent}
              />
            }
            contentContainerStyle={styles.agendaScrollContent}
          >
            {sortedReminders.length === 0 ? (
              <View style={styles.emptyDateState}>
                <View style={styles.emptyDateIcon}>
                  <Ionicons name="calendar-outline" size={64} color={WHATSAPP_COLORS.border} />
                </View>
                <Text style={styles.emptyDateTitle}>No Reminders</Text>
                <Text style={styles.emptyDateSubtitle}>
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
              <View style={styles.timelineContainer}>
                {sortedReminders.map((reminder, index) => (
                  <View key={reminder.id} style={styles.timelineItem}>
                    {/* Timeline line */}
                    {index < sortedReminders.length - 1 && (
                      <View style={styles.timelineLine} />
                    )}
                    
                    {/* Time circle */}
                    <View style={[styles.timeCircle, { backgroundColor: getColorValue(reminder.color) }]}>
                      <Text style={styles.timeCircleText}>
                        {formatTime(reminder.reminder_time).split(' ')[0]}
                      </Text>
                      <Text style={styles.timeCirclePeriod}>
                        {formatTime(reminder.reminder_time).split(' ')[1]}
                      </Text>
                    </View>
                    
                    {/* Reminder card */}
                    <TouchableOpacity
                      style={styles.reminderCard}
                      onPress={() => openDetailModal(reminder)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.reminderCardHeader, { backgroundColor: getColorValue(reminder.color) + '15' }]}>
                        <View style={styles.reminderCardTitleContainer}>
                          <View style={[styles.reminderColorIndicator, { backgroundColor: getColorValue(reminder.color) }]} />
                          <Text style={styles.reminderCardTitle} numberOfLines={1}>
                            {reminder.title}
                          </Text>
                        </View>
                        
                        <View style={styles.reminderCardActions}>
                          <TouchableOpacity
                            onPress={(e) => {
                              e.stopPropagation();
                              setSelectedReminder(reminder);
                              openEditMode();
                            }}
                            activeOpacity={0.7}
                            style={styles.cardActionButton}
                          >
                            <Ionicons name="pencil" size={16} color={WHATSAPP_COLORS.textSecondary} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={(e) => {
                              e.stopPropagation();
                              handleDeleteReminder(reminder.id);
                            }}
                            activeOpacity={0.7}
                            style={styles.cardActionButton}
                          >
                            <Ionicons name="trash" size={16} color={WHATSAPP_COLORS.error} />
                          </TouchableOpacity>
                        </View>
                      </View>
                      
                      <View style={styles.reminderCardContent}>
                        {reminder.description && (
                          <Text style={styles.reminderCardDescription} numberOfLines={3}>
                            {reminder.description}
                          </Text>
                        )}
                        
                        {reminder.also_share_with.length > 0 && (
                          <View style={styles.reminderSharedWith}>
                            <Ionicons name="people" size={14} color={WHATSAPP_COLORS.textTertiary} />
                            <Text style={styles.reminderSharedText}>
                              Shared with {reminder.also_share_with.length} person{reminder.also_share_with.length !== 1 ? 's' : ''}
                            </Text>
                          </View>
                        )}
                        
                        <TouchableOpacity
                          style={styles.completeButtonCard}
                          onPress={(e) => {
                            e.stopPropagation();
                            handleToggleComplete(reminder.id, reminder.is_completed);
                          }}
                          activeOpacity={0.7}
                        >
                          <View style={[
                            styles.checkboxCard,
                            reminder.is_completed && styles.checkboxCompletedCard
                          ]}>
                            {reminder.is_completed && (
                              <Ionicons name="checkmark" size={12} color={WHATSAPP_COLORS.surface} />
                            )}
                          </View>
                          <Text style={[
                            styles.completeButtonTextCard,
                            reminder.is_completed && styles.completeButtonTextCompletedCard
                          ]}>
                            {reminder.is_completed ? 'Completed' : 'Mark Complete'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
                  </View>
                ))}
                
                {/* Add reminder card at the end */}
                <TouchableOpacity
                  style={styles.addTimelineItem}
                  onPress={() => openCreateModalForDate(selectedDate)}
                  activeOpacity={0.7}
                >
                  <View style={styles.addTimeCircle}>
                    <Ionicons name="add" size={20} color={WHATSAPP_COLORS.accent} />
                  </View>
                  <View style={styles.addReminderCard}>
                    <Text style={styles.addReminderText}>Add another reminder</Text>
                  </View>
                </TouchableOpacity>
              </View>
            )}
            <View style={{ height: 100 }} />
          </ScrollView>
        </View>
      );
    }

    // Regular Agenda View (no specific date selected)
    return (
      <View style={styles.agendaView}>
        <ScrollView 
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[WHATSAPP_COLORS.accent]}
              tintColor={WHATSAPP_COLORS.accent}
            />
          }
          contentContainerStyle={styles.agendaScrollContent}
        >
          {Object.keys(groupedReminders).length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyStateIcon}>
                <Ionicons name="calendar-outline" size={80} color={WHATSAPP_COLORS.border} />
              </View>
              <Text style={styles.emptyStateTitle}>No Reminders</Text>
              <Text style={styles.emptyStateSubtitle}>
                Tap the + button to add a new reminder
              </Text>
            </View>
          ) : (
            Object.keys(groupedReminders).map(dateKey => (
              <View key={dateKey} style={styles.agendaDateSection}>
                {/* Date Header */}
                <View style={styles.agendaDateHeader}>
                  <Text style={styles.agendaDateText}>
                    {formatDate(dateKey)}
                  </Text>
                  <TouchableOpacity
                    style={styles.addDateReminderButton}
                    onPress={() => {
                      const [year, month, day] = dateKey.split('-').map(Number);
                      const dateObj = new Date(year, month - 1, day);
                      setSelectedDate(dateObj);
                      setViewMode('agenda');
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.addDateReminderButtonText}>
                      {groupedReminders[dateKey].length} reminder{groupedReminders[dateKey].length !== 1 ? 's' : ''}
                    </Text>
                    <Ionicons name="chevron-forward" size={16} color={WHATSAPP_COLORS.textTertiary} />
                  </TouchableOpacity>
                </View>
                
                {/* Reminder Cards */}
                <View style={styles.agendaRemindersList}>
                  {groupedReminders[dateKey].slice(0, 3).map((reminder) => (
                    <TouchableOpacity
                      key={reminder.id}
                      style={styles.agendaReminderCard}
                      onPress={() => openDetailModal(reminder)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.agendaReminderColorBar, { backgroundColor: getColorValue(reminder.color) }]} />
                      <View style={styles.agendaReminderContent}>
                        <View style={styles.agendaReminderHeader}>
                          <Text style={styles.agendaReminderTime}>
                            {formatTime(reminder.reminder_time)}
                          </Text>
                          <View style={styles.agendaReminderStatus}>
                            {reminder.is_completed ? (
                              <View style={styles.completedBadge}>
                                <Ionicons name="checkmark" size={12} color={WHATSAPP_COLORS.success} />
                                <Text style={styles.completedBadgeText}>Completed</Text>
                              </View>
                            ) : (
                              <View style={styles.pendingBadge}>
                                <Text style={styles.pendingBadgeText}>Pending</Text>
                              </View>
                            )}
                          </View>
                        </View>
                        
                        <Text style={styles.agendaReminderTitle} numberOfLines={2}>
                          {reminder.title}
                        </Text>
                        
                        {reminder.description && (
                          <Text style={styles.agendaReminderDescription} numberOfLines={2}>
                            {reminder.description}
                          </Text>
                        )}
                        
                        <View style={styles.agendaReminderFooter}>
                          {reminder.also_share_with.length > 0 && (
                            <View style={styles.agendaSharedIndicator}>
                              <Ionicons name="people" size={12} color={WHATSAPP_COLORS.textTertiary} />
                              <Text style={styles.agendaSharedText}>
                                {reminder.also_share_with.length}
                              </Text>
                            </View>
                          )}
                          
                          <View style={styles.agendaCardActions}>
                            <TouchableOpacity
                              onPress={(e) => {
                                e.stopPropagation();
                                setSelectedReminder(reminder);
                                openEditMode();
                              }}
                              activeOpacity={0.7}
                              style={styles.agendaCardActionButton}
                            >
                              <Ionicons name="pencil" size={14} color={WHATSAPP_COLORS.textSecondary} />
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={(e) => {
                                e.stopPropagation();
                                handleToggleComplete(reminder.id, reminder.is_completed);
                              }}
                              activeOpacity={0.7}
                              style={styles.agendaCardActionButton}
                            >
                              <Ionicons 
                                name={reminder.is_completed ? "checkbox" : "square-outline"} 
                                size={14} 
                                color={reminder.is_completed ? WHATSAPP_COLORS.success : WHATSAPP_COLORS.textSecondary} 
                              />
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                  
                  {groupedReminders[dateKey].length > 3 && (
                    <TouchableOpacity
                      style={styles.viewAllButton}
                      onPress={() => {
                        const [year, month, day] = dateKey.split('-').map(Number);
                        const dateObj = new Date(year, month - 1, day);
                        setSelectedDate(dateObj);
                        setViewMode('agenda');
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.viewAllButtonText}>
                        View all {groupedReminders[dateKey].length} reminders
                      </Text>
                      <Ionicons name="chevron-forward" size={14} color={WHATSAPP_COLORS.accent} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))
          )}
          <View style={{ height: 100 }} />
        </ScrollView>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#2D3748" />

      {/* BUP Style Header - Same as Employee file */}
      <View style={styles.headerBanner}>
        <LinearGradient
          colors={['#4A5568', '#2D3748']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerBanner}
        >
          {/* Background Image */}
          <Image
            source={require('../assets/bg.jpeg')}
            style={styles.headerImage}
            resizeMode="cover"
          />
          
          {/* Dark overlay for better text visibility */}
          <View style={styles.headerOverlay} />
          
          {/* Header Content */}
          <View style={[styles.headerContent, { 
            paddingTop: Platform.OS === 'ios' ? 50 : 40 
          }]}>
            {/* Top row with back button, logo, and actions */}
            <View style={styles.headerTopRow}>
              {/* Left side - Back button */}
              <View style={styles.leftSection}>
                <TouchableOpacity 
                  style={styles.backButton} 
                  onPress={onBack}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <BackIcon />
                </TouchableOpacity>
              </View>
              
              {/* Center - Logo */}
              <View style={styles.centerSection}>
                <Text style={styles.logoText}>CITADEL</Text>
              </View>
              
              {/* Right side - Action buttons */}
              <View style={styles.rightSection}>
                <TouchableOpacity 
                  style={styles.actionButton} 
                  onPress={() => setShowSearch(!showSearch)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="search" size={20} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.actionButton} 
                  onPress={() => {
                    setSelectedDate(null);
                    setShowCreateModal(true);
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="add" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
          
          {/* Title Section */}
          <View style={styles.titleSection}>
            <Text style={styles.sectionTitle}>Reminders</Text>
            <Text style={styles.sectionSubtitle}>
              {filteredReminders.length} reminder{filteredReminders.length !== 1 ? 's' : ''}
            </Text>
          </View>

          {/* View Mode Toggle */}
          <View style={styles.viewToggleContainer}>
            <TouchableOpacity
              style={[styles.viewToggleButton, viewMode === 'month' && styles.viewToggleButtonActive]}
              onPress={() => {
                setViewMode('month');
                setSelectedDate(null);
              }}
              activeOpacity={0.7}
            >
              <Text style={[styles.viewToggleText, viewMode === 'month' && styles.viewToggleTextActive]}>
                Calendar
              </Text>
            </TouchableOpacity>
            <View style={styles.viewToggleDivider} />
            <TouchableOpacity
              style={[styles.viewToggleButton, viewMode === 'agenda' && styles.viewToggleButtonActive]}
              onPress={() => setViewMode('agenda')}
              activeOpacity={0.7}
            >
              <Text style={[styles.viewToggleText, viewMode === 'agenda' && styles.viewToggleTextActive]}>
                Agenda
              </Text>
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          {showSearch && (
            <View style={styles.searchContainer}>
              <View style={[
                styles.searchInputContainer,
                searchFocused && styles.searchInputContainerFocused
              ]}>
                <Ionicons
                  name="search"
                  size={18}
                  color={searchFocused ? WHATSAPP_COLORS.accent : WHATSAPP_COLORS.textTertiary}
                  style={styles.searchIcon}
                />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search reminders..."
                  placeholderTextColor={WHATSAPP_COLORS.textTertiary}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity
                    style={styles.clearButton}
                    onPress={() => setSearchQuery('')}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="close-circle" size={18} color={WHATSAPP_COLORS.textTertiary} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        </LinearGradient>
      </View>

      {/* Content Area */}
      <View style={styles.content}>
        {/* Month Navigation */}
        <View style={styles.monthSelector}>
          <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.monthNavButton}>
            <Ionicons name="chevron-back" size={20} color={WHATSAPP_COLORS.primary} />
          </TouchableOpacity>
          
          {/* <TouchableOpacity onPress={goToToday} style={styles.todayButton}>
            <Text style={styles.todayButtonText}>Today</Text>
          </TouchableOpacity> */}
          
          <Text style={styles.monthYearText}>
            {getMonthName(currentDate.getMonth())} {currentDate.getFullYear()}
          </Text>
          
          <TouchableOpacity onPress={() => changeMonth(1)} style={styles.monthNavButton}>
            <Ionicons name="chevron-forward" size={20} color={WHATSAPP_COLORS.primary} />
          </TouchableOpacity>
        </View>

        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={WHATSAPP_COLORS.primary} />
            <Text style={styles.loadingText}>Loading reminders...</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[WHATSAPP_COLORS.accent]}
                tintColor={WHATSAPP_COLORS.accent}
              />
            }
          >
            {viewMode === 'month' && renderCalendar()}
            {(viewMode === 'agenda' || selectedDate) && <AgendaView />}
          </ScrollView>
        )}
      </View>

      {/* Create/Edit Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle="formSheet" // Changed from "pageSheet" to reduce height
        onRequestClose={() => {
          setShowCreateModal(false);
          resetForm();
        }}
      >
        <SafeAreaView style={styles.modalContainer}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => {
                setShowCreateModal(false);
                resetForm();
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.modalHeaderButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalHeaderTitle}>{isEditMode ? 'Edit Reminder' : 'New Reminder'}</Text>
            <TouchableOpacity 
              onPress={isEditMode ? handleUpdateReminder : handleCreateReminder} 
              disabled={submitting} 
              activeOpacity={0.7}
            >
              <Text style={[styles.modalHeaderButton, styles.modalHeaderButtonPrimary, submitting && styles.modalHeaderButtonDisabled]}>
                {submitting ? 'Saving...' : isEditMode ? 'Save' : 'Add'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView 
            style={styles.modalContent} 
            keyboardShouldPersistTaps="handled" 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.modalScrollContent} // Added to control modal height
          >
            <View style={styles.modalForm}>
              {/* Title Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Title</Text>
                <TextInput
                  style={styles.inputField}
                  placeholder="Add a title"
                  value={title}
                  onChangeText={setTitle}
                  placeholderTextColor={WHATSAPP_COLORS.textTertiary}
                />
              </View>

              {/* Type Dropdown */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Type</Text>
                <TouchableOpacity
                  style={styles.dropdownButton}
                  onPress={() => setShowTypeDropdown(!showTypeDropdown)}
                  activeOpacity={0.7}
                >
                  <View style={styles.dropdownContent}>
                    {selectedType ? (
                      <Text style={styles.dropdownText}>
                        {selectedType === 'other' && customType.trim() 
                          ? customType 
                          : reminderTypes.find(t => t.value === selectedType)?.label}
                      </Text>
                    ) : (
                      <Text style={styles.dropdownPlaceholder}>Select reminder type</Text>
                    )}
                  </View>
                  <Ionicons name="chevron-down" size={16} color={WHATSAPP_COLORS.textTertiary} />
                </TouchableOpacity>

                {showTypeDropdown && (
                  <View style={styles.dropdownList}>
                    <ScrollView style={styles.dropdownScroll} nestedScrollEnabled={true}>
                      {reminderTypes.map((type) => (
                        <TouchableOpacity
                          key={type.value}
                          style={[
                            styles.dropdownItem,
                            selectedType === type.value && styles.dropdownItemActive
                          ]}
                          onPress={() => {
                            setSelectedType(type.value);
                            if (type.value !== 'other') {
                              setCustomType('');
                            }
                            setShowTypeDropdown(false);
                          }}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.dropdownItemIcon}>{type.icon}</Text>
                          <Text style={[
                            styles.dropdownItemText,
                            selectedType === type.value && styles.dropdownItemTextActive
                          ]}>
                            {type.label}
                          </Text>
                          {selectedType === type.value && (
                            <Ionicons name="checkmark" size={16} color={WHATSAPP_COLORS.accent} />
                          )}
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {selectedType === 'other' && !showTypeDropdown && (
                  <TextInput
                    style={styles.customTypeInput}
                    placeholder="Enter custom type"
                    value={customType}
                    onChangeText={setCustomType}
                    placeholderTextColor={WHATSAPP_COLORS.textTertiary}
                    autoFocus
                  />
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Date</Text>
                <TextInput
                  style={styles.inputField}
                  placeholder="YYYY-MM-DD"
                  value={date}
                  onChangeText={setDate}
                  placeholderTextColor={WHATSAPP_COLORS.textTertiary}
                  editable={!selectedDate}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Time</Text>
                <TouchableOpacity
                  style={styles.timeInputButton}
                  onPress={() => setShowTimePicker(!showTimePicker)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.timeInputText}>
                    {selectedHour}:{selectedMinute} {selectedPeriod}
                  </Text>
                  <Ionicons name="time" size={16} color={WHATSAPP_COLORS.textTertiary} />
                </TouchableOpacity>

                {showTimePicker && (
                  <View style={styles.timePickerContainer}>
                    <View style={styles.timePickerRow}>
                      <ScrollView 
                        style={styles.timePickerColumn}
                        showsVerticalScrollIndicator={false}
                      >
                        {hours.map(hour => (
                          <TouchableOpacity
                            key={hour}
                            style={[
                              styles.timePickerOption,
                              selectedHour === hour && styles.timePickerOptionActive
                            ]}
                            onPress={() => setSelectedHour(hour)}
                            activeOpacity={0.7}
                          >
                            <Text style={[
                              styles.timePickerOptionText,
                              selectedHour === hour && styles.timePickerOptionTextActive
                            ]}>
                              {hour}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>

                      <ScrollView 
                        style={styles.timePickerColumn}
                        showsVerticalScrollIndicator={false}
                      >
                        {minutes.map(minute => (
                          <TouchableOpacity
                            key={minute}
                            style={[
                              styles.timePickerOption,
                              selectedMinute === minute && styles.timePickerOptionActive
                            ]}
                            onPress={() => setSelectedMinute(minute)}
                            activeOpacity={0.7}
                          >
                            <Text style={[
                              styles.timePickerOptionText,
                              selectedMinute === minute && styles.timePickerOptionTextActive
                            ]}>
                              {minute}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>

                      <ScrollView 
                        style={styles.timePickerColumn}
                        showsVerticalScrollIndicator={false}
                      >
                        {periods.map(period => (
                          <TouchableOpacity
                            key={period}
                            style={[
                              styles.timePickerOption,
                              selectedPeriod === period && styles.timePickerOptionActive
                            ]}
                            onPress={() => setSelectedPeriod(period)}
                            activeOpacity={0.7}
                          >
                            <Text style={[
                              styles.timePickerOptionText,
                              selectedPeriod === period && styles.timePickerOptionTextActive
                            ]}>
                              {period}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                    <TouchableOpacity
                      style={styles.timePickerDoneButton}
                      onPress={() => setShowTimePicker(false)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.timePickerDoneButtonText}>Done</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Description</Text>
                <TextInput
                  style={styles.inputTextArea}
                  placeholder="Add notes..."
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={4}
                  placeholderTextColor={WHATSAPP_COLORS.textTertiary}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Color</Text>
                <View style={styles.colorPickerRow}>
                  {eventColors.map(color => (
                    <TouchableOpacity
                      key={color.name}
                      style={[
                        styles.colorOption,
                        { backgroundColor: color.value },
                        selectedColor === color.value && styles.colorOptionSelected
                      ]}
                      onPress={() => setSelectedColor(color.value)}
                      activeOpacity={0.7}
                    />
                  ))}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Share With</Text>
                
                {selectedEmployees.length > 0 && (
                  <View style={styles.selectedEmployeesContainer}>
                    {selectedEmployees.map((emp) => (
                      <View key={emp.employee_id} style={styles.employeeChip}>
                        <Text style={styles.employeeChipText}>{emp.full_name.split(' ')[0]}</Text>
                        <TouchableOpacity
                          onPress={() => removeEmployee(emp.employee_id)}
                          activeOpacity={0.7}
                          style={styles.employeeChipRemove}
                        >
                          <Ionicons name="close" size={14} color={WHATSAPP_COLORS.surface} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}

                <TouchableOpacity
                  style={styles.addEmployeeButton}
                  onPress={() => setShowEmployeeSearch(!showEmployeeSearch)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="person-add" size={18} color={WHATSAPP_COLORS.accent} />
                  <Text style={styles.addEmployeeButtonText}>Add people</Text>
                </TouchableOpacity>

                {showEmployeeSearch && (
                  <View style={styles.employeeSearchContainer}>
                    <TextInput
                      style={styles.employeeSearchInput}
                      placeholder="Search by name..."
                      value={employeeSearchQuery}
                      onChangeText={setEmployeeSearchQuery}
                      placeholderTextColor={WHATSAPP_COLORS.textTertiary}
                      autoFocus
                    />
                    
                    {searchingEmployees ? (
                      <View style={styles.employeeSearchLoading}>
                        <ActivityIndicator size="small" color={WHATSAPP_COLORS.primary} />
                      </View>
                    ) : employeeSearchResults.length > 0 ? (
                      <ScrollView style={styles.employeeSearchResults} nestedScrollEnabled={true}>
                        {employeeSearchResults.map((emp) => (
                          <TouchableOpacity
                            key={emp.employee_id}
                            style={styles.employeeSearchItem}
                            onPress={() => addEmployee(emp)}
                            activeOpacity={0.7}
                          >
                            <View style={styles.employeeAvatar}>
                              <Text style={styles.avatarText}>
                                {emp.full_name.charAt(0).toUpperCase()}
                              </Text>
                            </View>
                            <View style={styles.employeeSearchItemInfo}>
                              <Text style={styles.employeeSearchItemName}>{emp.full_name}</Text>
                              <Text style={styles.employeeSearchItemRole}>
                                {emp.role}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    ) : employeeSearchQuery.trim() ? (
                      <View style={styles.employeeSearchEmpty}>
                        <Text style={styles.employeeSearchEmptyText}>No employees found</Text>
                      </View>
                    ) : null}
                  </View>
                )}
              </View>
            </View>
            <View style={{ height: 40 }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Detail Modal - Fixed: Changed presentationStyle and improved button alignment */}
      <Modal
        visible={showDetailModal}
        animationType="slide"
        presentationStyle="formSheet" // Changed from "pageSheet" to reduce height
        onRequestClose={() => setShowDetailModal(false)}
      >
        {selectedReminder && (
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <TouchableOpacity onPress={() => setShowDetailModal(false)} activeOpacity={0.7}>
                  <Text style={styles.modalHeaderButton}>Done</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.modalHeaderCenter}>
                <Text style={styles.modalHeaderTitle}>Reminder Details</Text>
              </View>
              <View style={styles.modalHeaderRight}>
                <View style={styles.modalHeaderActions}>
                  <TouchableOpacity onPress={openEditMode} activeOpacity={0.7} style={styles.editButton}>
                    <Text style={styles.modalHeaderEdit}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDeleteReminder(selectedReminder.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.modalHeaderDelete}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
            <ScrollView 
              style={styles.modalContent} 
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalScrollContent} // Added to control modal height
            >
              <View style={styles.modalTopSection}>
                <View style={[styles.modalColorIndicator, { backgroundColor: getColorValue(selectedReminder.color) }]} />
                <Text style={styles.modalTitle}>{selectedReminder.title}</Text>
                <View style={styles.modalDateTimeContainer}>
                  <View style={styles.modalDateTimeItem}>
                    <Ionicons name="calendar" size={18} color={WHATSAPP_COLORS.textSecondary} />
                    <Text style={styles.modalText}>{formatDate(selectedReminder.reminder_date)}</Text>
                  </View>
                  <View style={styles.modalDateTimeItem}>
                    <Ionicons name="time" size={18} color={WHATSAPP_COLORS.textSecondary} />
                    <Text style={styles.modalText}>{formatTime(selectedReminder.reminder_time)}</Text>
                  </View>
                </View>
              </View>

              {selectedReminder.description && (
                <View style={styles.modalSection}>
                  <Text style={styles.modalLabel}>Notes</Text>
                  <Text style={styles.modalDescription}>{selectedReminder.description}</Text>
                </View>
              )}

              {selectedReminder.also_share_with.length > 0 && (
                <View style={styles.modalSection}>
                  <Text style={styles.modalLabel}>Shared With</Text>
                  {selectedReminder.also_share_with.map((empId, idx) => (
                    <View key={idx} style={styles.sharedWithItem}>
                      <Text style={styles.sharedWithDot}>•</Text>
                      <Text style={styles.modalText}>{empId}</Text>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.modalSection}>
                <TouchableOpacity
                  style={styles.completeButtonModal}
                  onPress={() => handleToggleComplete(selectedReminder.id, selectedReminder.is_completed)}
                  activeOpacity={0.7}
                >
                  <View style={[
                    styles.checkboxModal,
                    selectedReminder.is_completed && styles.checkboxCompletedModal
                  ]}>
                    {selectedReminder.is_completed && (
                      <Ionicons name="checkmark" size={14} color={WHATSAPP_COLORS.surface} />
                    )}
                  </View>
                  <Text style={[
                    styles.completeButtonTextModal,
                    selectedReminder.is_completed && styles.completeButtonTextCompletedModal
                  ]}>
                    {selectedReminder.is_completed ? 'Completed' : 'Mark as Complete'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </SafeAreaView>
        )}
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: WHATSAPP_COLORS.background,
  },
  
  // BUP Header Styles
  headerBanner: {
    height: 220,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    overflow: 'hidden',
    position: 'relative',
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
  backIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
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
  
  // View Toggle
  viewToggleContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    padding: 2,
    marginHorizontal: 20,
    marginBottom: 15,
  },
  viewToggleButton: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 6,
  },
  viewToggleButtonActive: {
    backgroundColor: WHATSAPP_COLORS.surface,
  },
  viewToggleText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '600',
  },
  viewToggleTextActive: {
    color: WHATSAPP_COLORS.primary,
  },
  viewToggleDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  
  // Search
  searchContainer: {
    paddingHorizontal: 20,
    paddingBottom: 15,
    position: 'relative',
    zIndex: 1,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  searchInputContainerFocused: {
    borderColor: WHATSAPP_COLORS.accent,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: WHATSAPP_COLORS.textPrimary,
    padding: 0,
  },
  clearButton: {
    padding: 4,
  },
  
  // Content
  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  
  // Month Selector
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: WHATSAPP_COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  monthNavButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: WHATSAPP_COLORS.background,
  },
  todayButton: {
    backgroundColor: WHATSAPP_COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  todayButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  monthYearText: {
    fontSize: 18,
    fontWeight: '600',
    color: WHATSAPP_COLORS.textPrimary,
  },
  
  // Calendar
  calendarContainer: {
    backgroundColor: WHATSAPP_COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  weekDays: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  weekDayText: {
    fontSize: 12,
    fontWeight: '600',
    color: WHATSAPP_COLORS.textSecondary,
    width: 40,
    textAlign: 'center',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDay: {
    width: `${100 / 7}%`,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  dayCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    position: 'relative',
  },
  todayCircle: {
    borderWidth: 2,
    borderColor: WHATSAPP_COLORS.accent,
  },
  dayText: {
    fontSize: 14,
    fontWeight: '500',
  },
  dayNumberPast: {
    color: WHATSAPP_COLORS.textTertiary,
  },
  dayEventsIndicator: {
    position: 'absolute',
    bottom: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  dayEventDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  dayEventCount: {
    fontSize: 8,
    fontWeight: '600',
    marginLeft: 1,
  },
  
  // Agenda View
  agendaView: {
    flex: 1,
  },
  agendaScrollContent: {
    paddingBottom: 10,
  },
  
  // Selected Date Header
  selectedDateHeaderContainer: {
    marginBottom: 10,
  },
  selectedDateHeader: {
    padding: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    minHeight: 100,
  },
  backButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 8,
    fontWeight: '500',
  },
  selectedDateContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  selectedDateDay: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
    marginRight: 12,
  },
  selectedDateMonth: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  selectedDateYear: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
  },
  selectedDateRemindersCount: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  
  // Empty States
  emptyDateState: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 40,
  },
  emptyDateIcon: {
    marginBottom: 20,
  },
  emptyDateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: WHATSAPP_COLORS.textPrimary,
    marginBottom: 8,
  },
  emptyDateSubtitle: {
    fontSize: 15,
    color: WHATSAPP_COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  addReminderButtonLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WHATSAPP_COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
  },
  addReminderButtonTextLarge: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Timeline View (for selected date)
  timelineContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 24,
    position: 'relative',
  },
  timelineLine: {
    position: 'absolute',
    left: 29,
    top: 48,
    bottom: -24,
    width: 2,
    backgroundColor: WHATSAPP_COLORS.border,
  },
  timeCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    zIndex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  timeCircleText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  timeCirclePeriod: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
  },
  reminderCard: {
    flex: 1,
    backgroundColor: WHATSAPP_COLORS.surface,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  reminderCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  reminderCardTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  reminderColorIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  reminderCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: WHATSAPP_COLORS.textPrimary,
    flex: 1,
  },
  reminderCardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  cardActionButton: {
    padding: 4,
  },
  reminderCardContent: {
    padding: 16,
    paddingTop: 0,
  },
  reminderCardDescription: {
    fontSize: 14,
    color: WHATSAPP_COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  reminderSharedWith: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  reminderSharedText: {
    fontSize: 13,
    color: WHATSAPP_COLORS.textTertiary,
    marginLeft: 6,
  },
  completeButtonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: WHATSAPP_COLORS.border,
  },
  checkboxCard: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: WHATSAPP_COLORS.textTertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  checkboxCompletedCard: {
    backgroundColor: WHATSAPP_COLORS.success,
    borderColor: WHATSAPP_COLORS.success,
  },
  completeButtonTextCard: {
    fontSize: 14,
    color: WHATSAPP_COLORS.textPrimary,
    fontWeight: '500',
  },
  completeButtonTextCompletedCard: {
    color: WHATSAPP_COLORS.success,
  },
  addTimelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  addTimeCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: WHATSAPP_COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    borderWidth: 2,
    borderColor: WHATSAPP_COLORS.border,
    borderStyle: 'dashed',
  },
  addReminderCard: {
    flex: 1,
    padding: 16,
    backgroundColor: WHATSAPP_COLORS.surface,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: WHATSAPP_COLORS.border,
    borderStyle: 'dashed',
  },
  addReminderText: {
    fontSize: 14,
    color: WHATSAPP_COLORS.textSecondary,
    fontWeight: '500',
  },
  
  // Regular Agenda View
  agendaDateSection: {
    marginBottom: 24,
  },
  agendaDateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  agendaDateText: {
    fontSize: 18,
    fontWeight: '600',
    color: WHATSAPP_COLORS.textPrimary,
  },
  addDateReminderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WHATSAPP_COLORS.background,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  addDateReminderButtonText: {
    fontSize: 14,
    color: WHATSAPP_COLORS.textSecondary,
    fontWeight: '500',
  },
  agendaRemindersList: {
    paddingHorizontal: 20,
  },
  agendaReminderCard: {
    flexDirection: 'row',
    backgroundColor: WHATSAPP_COLORS.surface,
    borderRadius: 12,
    marginBottom: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  agendaReminderColorBar: {
    width: 6,
  },
  agendaReminderContent: {
    flex: 1,
    padding: 16,
  },
  agendaReminderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  agendaReminderTime: {
    fontSize: 14,
    color: WHATSAPP_COLORS.textSecondary,
    fontWeight: '500',
  },
  agendaReminderStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WHATSAPP_COLORS.success + '15',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  completedBadgeText: {
    fontSize: 12,
    color: WHATSAPP_COLORS.success,
    fontWeight: '500',
  },
  pendingBadge: {
    backgroundColor: WHATSAPP_COLORS.warning + '15',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pendingBadgeText: {
    fontSize: 12,
    color: WHATSAPP_COLORS.warning,
    fontWeight: '500',
  },
  agendaReminderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: WHATSAPP_COLORS.textPrimary,
    marginBottom: 6,
  },
  agendaReminderDescription: {
    fontSize: 14,
    color: WHATSAPP_COLORS.textSecondary,
    lineHeight: 18,
    marginBottom: 12,
  },
  agendaReminderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  agendaSharedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  agendaSharedText: {
    fontSize: 12,
    color: WHATSAPP_COLORS.textTertiary,
  },
  agendaCardActions: {
    flexDirection: 'row',
    gap: 12,
  },
  agendaCardActionButton: {
    padding: 4,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: WHATSAPP_COLORS.background,
    padding: 12,
    borderRadius: 8,
    gap: 6,
  },
  viewAllButtonText: {
    fontSize: 14,
    color: WHATSAPP_COLORS.accent,
    fontWeight: '500',
  },
  
  // Empty State (regular agenda)
  emptyState: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 40,
  },
  emptyStateIcon: {
    marginBottom: 20,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: WHATSAPP_COLORS.textPrimary,
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 15,
    color: WHATSAPP_COLORS.textSecondary,
    textAlign: 'center',
  },
  
  // Loading States
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 300,
  },
  loadingText: {
    fontSize: 16,
    color: WHATSAPP_COLORS.textSecondary,
    marginTop: 16,
  },
  
  // Modal Styles - Fixed: Reduced height and improved button alignment
  modalContainer: {
     flex: 1,
  backgroundColor: WHATSAPP_COLORS.background,
  },
  modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: WHATSAPP_COLORS.surface,
      borderBottomWidth: 0.5,
      borderBottomColor: WHATSAPP_COLORS.border,
      minHeight: 56,
  },
  modalHeaderLeft: {
    width: 60,
    alignItems: 'flex-start',
  },
  modalHeaderCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  modalHeaderRight: {
    width: 100,
    alignItems: 'flex-end',
  },
  modalHeaderActions: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
  },
  modalHeaderButton: {
    fontSize: 17,
    color: WHATSAPP_COLORS.accent,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  modalHeaderButtonPrimary: {
    fontWeight: '600',
  },
  modalHeaderButtonDisabled: {
    opacity: 0.5,
  },
  modalHeaderTitle: {
    fontSize: 17,
    color: WHATSAPP_COLORS.textPrimary,
    fontWeight: '600',
  },
  editButton: {
    paddingHorizontal: 8,
  },
  modalHeaderEdit: {
    fontSize: 17,
    color: WHATSAPP_COLORS.accent,
    fontWeight: '600',
  },
  modalHeaderDelete: {
    fontSize: 17,
    color: WHATSAPP_COLORS.error,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
  },
  modalScrollContent: {
    paddingBottom: 30, // Added to ensure content doesn't get cut off
  },
  modalForm: {
    padding: 16,
  },
  modalTopSection: {
    backgroundColor: WHATSAPP_COLORS.surface,
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: WHATSAPP_COLORS.border,
  },
  modalColorIndicator: {
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: WHATSAPP_COLORS.textPrimary,
    marginBottom: 16,
  },
  modalDateTimeContainer: {
    flexDirection: 'row',
    gap: 24,
  },
  modalDateTimeItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalText: {
    fontSize: 16,
    color: WHATSAPP_COLORS.textPrimary,
    marginLeft: 8,
  },
  modalSection: {
    backgroundColor: WHATSAPP_COLORS.surface,
    padding: 20,
    marginTop: 8,
    borderBottomWidth: 1,
    borderBottomColor: WHATSAPP_COLORS.border,
  },
  modalLabel: {
    fontSize: 15,
    color: WHATSAPP_COLORS.textSecondary,
    fontWeight: '600',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modalDescription: {
    fontSize: 16,
    color: WHATSAPP_COLORS.textPrimary,
    lineHeight: 22,
  },
  sharedWithItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sharedWithDot: {
    fontSize: 16,
    color: WHATSAPP_COLORS.textSecondary,
    marginRight: 8,
  },
  completeButtonModal: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WHATSAPP_COLORS.background,
    padding: 16,
    borderRadius: 12,
  },
  checkboxModal: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: WHATSAPP_COLORS.textTertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxCompletedModal: {
    backgroundColor: WHATSAPP_COLORS.success,
    borderColor: WHATSAPP_COLORS.success,
  },
  completeButtonTextModal: {
    fontSize: 17,
    color: WHATSAPP_COLORS.textPrimary,
    fontWeight: '500',
  },
  completeButtonTextCompletedModal: {
    color: WHATSAPP_COLORS.success,
  },
  
  // Form Inputs
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 15,
    color: WHATSAPP_COLORS.textSecondary,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputField: {
    backgroundColor: WHATSAPP_COLORS.surface,
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: WHATSAPP_COLORS.textPrimary,
    borderWidth: 1,
    borderColor: WHATSAPP_COLORS.border,
  },
  
  // Dropdown
  dropdownButton: {
    backgroundColor: WHATSAPP_COLORS.surface,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: WHATSAPP_COLORS.border,
  },
  dropdownContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dropdownText: {
    fontSize: 16,
    color: WHATSAPP_COLORS.textPrimary,
    fontWeight: '500',
  },
  dropdownPlaceholder: {
    fontSize: 16,
    color: WHATSAPP_COLORS.textTertiary,
  },
  dropdownList: {
    backgroundColor: WHATSAPP_COLORS.surface,
    borderRadius: 8,
    marginTop: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: WHATSAPP_COLORS.border,
    maxHeight: 280,
  },
  dropdownScroll: {
    maxHeight: 280,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: WHATSAPP_COLORS.border,
  },
  dropdownItemActive: {
    backgroundColor: WHATSAPP_COLORS.background,
  },
  dropdownItemIcon: {
    fontSize: 20,
    marginRight: 12,
    width: 28,
  },
  dropdownItemText: {
    fontSize: 16,
    color: WHATSAPP_COLORS.textPrimary,
    flex: 1,
  },
  dropdownItemTextActive: {
    fontWeight: '600',
    color: WHATSAPP_COLORS.primary,
  },
  customTypeInput: {
    backgroundColor: WHATSAPP_COLORS.surface,
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: WHATSAPP_COLORS.textPrimary,
    marginTop: 8,
    borderWidth: 1,
    borderColor: WHATSAPP_COLORS.accent,
  },
  
  // Time Picker
  timeInputButton: {
    backgroundColor: WHATSAPP_COLORS.surface,
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: WHATSAPP_COLORS.border,
  },
  timeInputText: {
    fontSize: 16,
    color: WHATSAPP_COLORS.textPrimary,
  },
  timePickerContainer: {
    backgroundColor: WHATSAPP_COLORS.surface,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: WHATSAPP_COLORS.border,
  },
  timePickerRow: {
    flexDirection: 'row',
    maxHeight: 200,
    padding: 8,
  },
  timePickerColumn: {
    flex: 1,
  },
  timePickerOption: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  timePickerOptionActive: {
    backgroundColor: WHATSAPP_COLORS.primary,
    borderRadius: 4,
  },
  timePickerOptionText: {
    fontSize: 16,
    color: WHATSAPP_COLORS.textPrimary,
  },
  timePickerOptionTextActive: {
    color: WHATSAPP_COLORS.surface,
    fontWeight: '600',
  },
  timePickerDoneButton: {
    padding: 12,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: WHATSAPP_COLORS.border,
  },
  timePickerDoneButtonText: {
    fontSize: 17,
    color: WHATSAPP_COLORS.accent,
    fontWeight: '600',
  },
  
  // Text Area
  inputTextArea: {
    backgroundColor: WHATSAPP_COLORS.surface,
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: WHATSAPP_COLORS.textPrimary,
    height: 100,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: WHATSAPP_COLORS.border,
  },
  
  // Color Picker
  colorPickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  colorOption: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorOptionSelected: {
    borderColor: WHATSAPP_COLORS.textPrimary,
    transform: [{ scale: 1.1 }],
  },
  
  // Employee Sharing
  selectedEmployeesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  employeeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WHATSAPP_COLORS.primary,
    borderRadius: 16,
    paddingLeft: 12,
    paddingRight: 8,
    paddingVertical: 6,
    gap: 4,
  },
  employeeChipText: {
    fontSize: 14,
    color: WHATSAPP_COLORS.surface,
    fontWeight: '500',
  },
  employeeChipRemove: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addEmployeeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WHATSAPP_COLORS.surface,
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: WHATSAPP_COLORS.border,
    borderStyle: 'dashed',
  },
  addEmployeeButtonText: {
    fontSize: 16,
    color: WHATSAPP_COLORS.accent,
    fontWeight: '500',
    marginLeft: 8,
  },
  employeeSearchContainer: {
    marginTop: 12,
    backgroundColor: WHATSAPP_COLORS.surface,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: WHATSAPP_COLORS.border,
  },
  employeeSearchInput: {
    fontSize: 16,
    color: WHATSAPP_COLORS.textPrimary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: WHATSAPP_COLORS.border,
  },
  employeeSearchLoading: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  employeeSearchResults: {
    maxHeight: 200,
  },
  employeeSearchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: WHATSAPP_COLORS.border,
  },
  employeeAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: WHATSAPP_COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 16,
    color: WHATSAPP_COLORS.surface,
    fontWeight: '600',
  },
  employeeSearchItemInfo: {
    flex: 1,
  },
  employeeSearchItemName: {
    fontSize: 16,
    color: WHATSAPP_COLORS.textPrimary,
    fontWeight: '500',
    marginBottom: 2,
  },
  employeeSearchItemRole: {
    fontSize: 14,
    color: WHATSAPP_COLORS.textSecondary,
  },
  employeeSearchEmpty: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  employeeSearchEmptyText: {
    fontSize: 15,
    color: WHATSAPP_COLORS.textSecondary,
  },
});

export default Reminder;