import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView,
  StatusBar, Modal, TextInput, Dimensions, ActivityIndicator, Alert, Platform
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

import AsyncStorage from '@react-native-async-storage/async-storage';
import { BACKEND_URL } from '../config/config';
const TOKEN_KEY = 'token_2';

const colors = {
  primary: '#008069', // WhatsApp green
  primaryLight: '#25D366',
  accent: '#007AFF', // iOS blue
  surface: '#FFFFFF',
  background: '#F0F2F5', // WhatsApp chat background
  text: '#111B21', // WhatsApp dark text
  textSecondary: '#667781', // WhatsApp secondary text
  textTertiary: '#8696A0',
  divider: '#E9EDEF', // WhatsApp subtle divider
  error: '#F44336',
  success: '#4CAF50',
  blue: '#0084FF',
  green: '#00A884', // WhatsApp green variant
  orange: '#FF6B35',
  purple: '#7B1FA2',
  pink: '#E91E63',
  yellow: '#FFC107',
};

const BackIcon = () => (
  <View style={styles.backIcon}>
    <Text style={styles.backArrow}>‹</Text>
  </View>
);

const EditIcon = () => (
  <View style={styles.iconContainer}>
    <Text style={styles.editIcon}>✏️</Text>
  </View>
);

const DeleteIcon = () => (
  <View style={styles.iconContainer}>
    <Text style={styles.deleteIcon}>🗑️</Text>
  </View>
);

const DropdownIcon = () => (
  <View style={styles.dropdownIcon}>
    <Text style={styles.dropdownArrow}>▼</Text>
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
  const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));
  const periods = ['AM', 'PM'];
  
  const eventColors = [
    { name: 'blue', value: colors.blue },
    { name: 'green', value: colors.green },
    { name: 'orange', value: colors.orange },
    { name: 'purple', value: colors.purple },
    { name: 'pink', value: colors.pink },
    { name: 'yellow', value: colors.yellow },
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
    }
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
    setSelectedColor(colors.blue);
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
    if (!colorName) return colors.blue;
    const colorObj = eventColors.find(c => c.name === colorName);
    return colorObj ? colorObj.value : colors.blue;
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
        setSelectedReminder(result.data); // ✅ Add this line to update the selected reminder
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
    setSelectedColor(colors.blue);
    setSelectedDate(dateObj);
    setDate(formatDateToYYYYMMDD(dateObj));
    setShowCreateModal(true);
    
  };

  const formatDate = (dateString: string): string => {
    const d = new Date(dateString + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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

  const MonthView = () => {
    const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentDate);
    const days = [];
    const today = new Date();
    const isCurrentMonth = today.getMonth() === month && today.getFullYear() === year;

    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(<View key={`empty-${i}`} style={styles.calendarDay} />);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dayReminders = getRemindersForDate(date);
      const isToday = isCurrentMonth && today.getDate() === day;
      const isPast = date < new Date(today.getFullYear(), today.getMonth(), today.getDate());

      days.push(
        <TouchableOpacity
          key={day}
          style={styles.calendarDay}
          onPress={() => {
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
          <View style={[styles.dayNumberContainer, isToday && styles.dayNumberToday]}>
            <Text style={[styles.dayNumber, isToday && styles.dayNumberTodayText, isPast && styles.dayNumberPast]}>
              {day}
            </Text>
          </View>
          {dayReminders.length > 0 && (
            <View style={styles.dayEventsContainer}>
              {dayReminders.slice(0, 3).map((reminder) => (
                <View
                  key={reminder.id}
                  style={[styles.dayEventDot, { backgroundColor: getColorValue(reminder.color) }]}
                />
              ))}
              {dayReminders.length > 3 && (
                <Text style={styles.moreEventsText}>+{dayReminders.length - 3}</Text>
              )}
            </View>
          )}
        </TouchableOpacity>
      );
    }

    return (
      <ScrollView style={styles.monthView} showsVerticalScrollIndicator={false}>
        <View style={styles.weekDaysRow}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, idx) => (
            <View key={idx} style={styles.weekDayCell}>
              <Text style={styles.weekDayText}>{day}</Text>
            </View>
          ))}
        </View>
        <View style={styles.calendarGrid}>{days}</View>
        <View style={{ height: 20 }} />
      </ScrollView>
    );
  };

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

    return (
      <View style={styles.agendaView}>
        {selectedDate && (
          <View style={styles.selectedDateHeader}>
            <TouchableOpacity
              style={styles.backToAllButton}
              onPress={() => {
                setSelectedDate(null);
                setViewMode('agenda');
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.backToAllButtonText}>← All Reminders</Text>
            </TouchableOpacity>
            <Text style={styles.selectedDateText}>
              {formatDate(formatDateToYYYYMMDD(selectedDate))}
            </Text>
          </View>
        )}
        <ScrollView showsVerticalScrollIndicator={false}>
          {Object.keys(groupedReminders).length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateIcon}>📅</Text>
              <Text style={styles.emptyStateTitle}>No Reminders</Text>
              <Text style={styles.emptyStateSubtitle}>
                {selectedDate ? 'No reminders for this date' : 'Tap + to add a new reminder'}
              </Text>
            </View>
          ) : (
            Object.keys(groupedReminders).map(dateKey => (
              <View key={dateKey} style={styles.agendaSection}>
                <View style={styles.agendaDateHeaderContainer}>
                  <Text style={styles.agendaDateHeader}>{formatDate(dateKey)}</Text>
                  <TouchableOpacity
                    style={styles.addReminderButton}
                    onPress={() => {
                      const [year, month, day] = dateKey.split('-').map(Number);
                      const dateObj = new Date(year, month - 1, day);
                      openCreateModalForDate(dateObj);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.addReminderButtonText}>+</Text>
                  </TouchableOpacity>
                </View>
                {groupedReminders[dateKey].map((reminder) => (
                  <TouchableOpacity
                    key={reminder.id}
                    style={styles.agendaItem}
                    onPress={() => openDetailModal(reminder)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.agendaItemAccent, { backgroundColor: getColorValue(reminder.color) }]} />
                    <View style={styles.agendaItemContent}>
                      <View style={styles.agendaItemHeader}>
                        <View style={styles.agendaItemTimeContainer}>
                          <Text style={styles.agendaItemTime}>{formatTime(reminder.reminder_time)}</Text>
                        </View>
                        <View style={styles.agendaItemActions}>
                          <TouchableOpacity
                            onPress={(e) => {
                              e.stopPropagation();
                              setSelectedReminder(reminder);
                              openEditMode();
                            }}
                            activeOpacity={0.7}
                            style={styles.agendaActionButton}
                          >
                            <EditIcon />
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={(e) => {
                              e.stopPropagation();
                              handleDeleteReminder(reminder.id);
                            }}
                            activeOpacity={0.7}
                            style={styles.agendaActionButton}
                          >
                            <DeleteIcon />
                          </TouchableOpacity>
                        </View>
                      </View>
                      <Text style={[
                        styles.agendaItemTitle,
                        reminder.is_completed && styles.agendaItemTitleCompleted
                      ]}>
                        {reminder.title}
                      </Text>
                      {reminder.description && (
                        <Text style={styles.agendaItemDesc} numberOfLines={2}>
                          {reminder.description}
                        </Text>
                      )}
                      {reminder.also_share_with.length > 0 && (
                        <View style={styles.sharedWithContainer}>
                          <Text style={styles.agendaItemShared}>
                            👥 Shared with {reminder.also_share_with.length}
                          </Text>
                        </View>
                      )}
                      <TouchableOpacity
                        style={styles.completeButton}
                        onPress={(e) => {
                          e.stopPropagation();
                          handleToggleComplete(reminder.id, reminder.is_completed);
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={[
                          styles.checkbox,
                          reminder.is_completed && styles.checkboxCompleted
                        ]}>
                          {reminder.is_completed && (
                            <Text style={styles.checkmark}>✓</Text>
                          )}
                        </View>
                        <Text style={[
                          styles.completeButtonText,
                          reminder.is_completed && styles.completeButtonTextCompleted
                        ]}>
                          {reminder.is_completed ? 'Completed' : 'Mark as Complete'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            ))
          )}
          <View style={{ height: 100 }} />
        </ScrollView>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      
      {/* Main Content Container with proper safe area handling */}
      <View style={[styles.contentContainer, ]}>
        {/* Header with WhatsApp feel */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
              <BackIcon />
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>Reminder</Text>
              <View style={styles.viewToggle}>
                <TouchableOpacity
                  style={[styles.viewToggleButton, viewMode === 'month' && styles.viewToggleButtonActive]}
                  onPress={() => {
                    setViewMode('month');
                    setSelectedDate(null);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.viewToggleText, viewMode === 'month' && styles.viewToggleTextActive]}>
                    Month
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
            </View>
            <TouchableOpacity
              style={styles.searchButton}
              onPress={() => setShowSearch(!showSearch)}
              activeOpacity={0.7}
            >
              <Text style={styles.searchButtonIcon}>🔍</Text>
            </TouchableOpacity>
          </View>
        </View>

        {showSearch && (
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search reminders..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor={colors.textTertiary}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearSearchButton}>
                <Text style={styles.clearSearchButtonText}>✕</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        )}

        {/* Calendar Navigation with Google Calendar feel */}
        <View style={styles.calendarHeader}>
          <View style={styles.monthNavigation}>
            <TouchableOpacity onPress={() => changeMonth(-1)} activeOpacity={0.7} style={styles.navButton}>
              <Text style={styles.navArrow}>‹</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={goToToday} activeOpacity={0.7} style={styles.todayButton}>
              <Text style={styles.todayButtonText}>Today</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => changeMonth(1)} activeOpacity={0.7} style={styles.navButton}>
              <Text style={styles.navArrow}>›</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.monthYearText}>
            {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </Text>
        </View>

        <View style={styles.content}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Loading reminders...</Text>
            </View>
          ) : (
            <>
              {viewMode === 'month' && <MonthView />}
              {(viewMode === 'agenda' || selectedDate) && <AgendaView />}
            </>
          )}
        </View>
      </View>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom > 0 ? insets.bottom + 20 : 20 }]}
        onPress={() => {
          setSelectedDate(null);
          setShowCreateModal(true);
        }}
        activeOpacity={0.8}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* Detail Modal */}
      <Modal
        visible={showDetailModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDetailModal(false)}
      >
        {selectedReminder && (
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowDetailModal(false)} activeOpacity={0.7}>
                <Text style={styles.modalHeaderButton}>Done</Text>
              </TouchableOpacity>
              <View style={styles.modalHeaderCenter}>
                <Text style={styles.modalHeaderTitle}>Reminder Details</Text>
              </View>
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
            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              <View style={styles.modalTopSection}>
                <View style={[styles.modalColorIndicator, { backgroundColor: getColorValue(selectedReminder.color) }]} />
                <Text style={styles.modalTitle}>{selectedReminder.title}</Text>
                <View style={styles.modalDateTimeContainer}>
                  <View style={styles.modalDateTimeItem}>
                    <Text style={styles.modalIcon}>📅</Text>
                    <Text style={styles.modalText}>{formatDate(selectedReminder.reminder_date)}</Text>
                  </View>
                  <View style={styles.modalDateTimeItem}>
                    <Text style={styles.modalIcon}>🕐</Text>
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
                      <Text style={styles.checkmarkModal}>✓</Text>
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

      {/* Create/Edit Modal - RESTORED TITLE DROPDOWN */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setShowCreateModal(false);
          resetForm();
        }}
      >
        <SafeAreaView style={styles.modalContainer}>
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
            nestedScrollEnabled={true}
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
                  placeholderTextColor={colors.textTertiary}
                />
              </View>

              {/* Type Dropdown - RESTORED */}
              <View style={styles.typeSection}>
                <Text style={styles.sectionTitle}>Type</Text>
                <TouchableOpacity
                  style={styles.typeDropdownButton}
                  onPress={() => setShowTypeDropdown(!showTypeDropdown)}
                  activeOpacity={0.7}
                >
                  <View style={styles.typeDropdownContent}>
                    {selectedType ? (
                      <>
                        <Text style={styles.typeDropdownIcon}>
                          {reminderTypes.find(t => t.value === selectedType)?.icon}
                        </Text>
                        <Text style={styles.typeDropdownText}>
                          {selectedType === 'other' && customType.trim() 
                            ? customType 
                            : reminderTypes.find(t => t.value === selectedType)?.label}
                        </Text>
                      </>
                    ) : (
                      <Text style={styles.typeDropdownPlaceholder}>Select reminder type</Text>
                    )}
                  </View>
                  <DropdownIcon />
                </TouchableOpacity>

                {showTypeDropdown && (
                  <View style={styles.typeDropdownList}>
                    <ScrollView style={styles.typeDropdownScroll} nestedScrollEnabled={true}>
                      {reminderTypes.map((type) => (
                        <TouchableOpacity
                          key={type.value}
                          style={[
                            styles.typeDropdownItem,
                            selectedType === type.value && styles.typeDropdownItemActive
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
                          <Text style={styles.typeDropdownItemIcon}>{type.icon}</Text>
                          <Text style={[
                            styles.typeDropdownItemText,
                            selectedType === type.value && styles.typeDropdownItemTextActive
                          ]}>
                            {type.label}
                          </Text>
                          {selectedType === type.value && (
                            <Text style={styles.typeDropdownItemCheck}>✓</Text>
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
                    placeholderTextColor={colors.textTertiary}
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
                  placeholderTextColor={colors.textTertiary}
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
                  <Text style={styles.timeInputArrow}>▼</Text>
                </TouchableOpacity>

                {showTimePicker && (
                  <View style={styles.timePickerContainer}>
                    <View style={styles.timePickerRow}>
                      <ScrollView 
                        style={styles.timePickerColumn}
                        showsVerticalScrollIndicator={false}
                        nestedScrollEnabled={true}
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
                        nestedScrollEnabled={true}
                      >
                        {minutes.filter((_, i) => i % 5 === 0).map(minute => (
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
                        nestedScrollEnabled={true}
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
                  placeholderTextColor={colors.textTertiary}
                />
              </View>

              <View style={styles.colorPickerSection}>
                <Text style={styles.sectionTitle}>Color</Text>
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

              <View style={styles.employeeSection}>
                <Text style={styles.sectionTitle}>Share With</Text>
                
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
                          <Text style={styles.employeeChipRemoveText}>×</Text>
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
                  <Text style={styles.addEmployeeButtonIcon}>+</Text>
                  <Text style={styles.addEmployeeButtonText}>Add people</Text>
                </TouchableOpacity>

                {showEmployeeSearch && (
                  <View style={styles.employeeSearchContainer}>
                    <TextInput
                      style={styles.employeeSearchInput}
                      placeholder="Search by name..."
                      value={employeeSearchQuery}
                      onChangeText={setEmployeeSearchQuery}
                      placeholderTextColor={colors.textTertiary}
                      autoFocus
                    />
                    
                    {searchingEmployees ? (
                      <View style={styles.employeeSearchLoading}>
                        <ActivityIndicator size="small" color={colors.primary} />
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  contentContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  // Header Styles (WhatsApp inspired)
  header: {
    backgroundColor: colors.primary,
    paddingBottom: 12,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  backIcon: {
    marginRight: 4,
  },
  backArrow: {
    fontSize: 24,
    color: colors.surface,
    fontWeight: '300',
  },
  backButtonText: {
    fontSize: 16,
    color: colors.surface,
    fontWeight: '500',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.surface,
    marginBottom: 8,
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    padding: 2,
  },
  viewToggleButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 6,
  },
  viewToggleButtonActive: {
    backgroundColor: colors.surface,
  },
  viewToggleText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '600',
  },
  viewToggleTextActive: {
    color: colors.primary,
  },
  viewToggleDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  searchButton: {
    padding: 8,
  },
  searchButtonIcon: {
    fontSize: 20,
    color: colors.surface,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    paddingVertical: 8,
  },
  clearSearchButton: {
    padding: 8,
  },
  clearSearchButtonText: {
    fontSize: 16,
    color: colors.textTertiary,
  },
  // Calendar Header (Google Calendar inspired)
  calendarHeader: {
    backgroundColor: colors.surface,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  monthNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  navButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: colors.background,
  },
  navArrow: {
    fontSize: 20,
    color: colors.text,
    fontWeight: '600',
  },
  todayButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: colors.primary,
    borderRadius: 20,
  },
  todayButtonText: {
    color: colors.surface,
    fontWeight: '600',
    fontSize: 14,
  },
  monthYearText: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.textSecondary,
  },
  // Month View Styles
  monthView: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  weekDaysRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  weekDayCell: {
    flex: 1,
    alignItems: 'center',
  },
  weekDayText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: colors.surface,
    paddingHorizontal: 4,
    paddingTop: 8,
  },
  calendarDay: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.divider,
  },
  dayNumberContainer: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    marginBottom: 4,
  },
  dayNumberToday: {
    backgroundColor: colors.primary,
  },
  dayNumber: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
  },
  dayNumberTodayText: {
    color: colors.surface,
    fontWeight: '700',
  },
  dayNumberPast: {
    color: colors.textTertiary,
  },
  dayEventsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    maxWidth: '80%',
  },
  dayEventDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginHorizontal: 1,
  },
  moreEventsText: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  // Agenda View Styles
  agendaView: {
    flex: 1,
    backgroundColor: colors.background,
  },
  selectedDateHeader: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  backToAllButton: {
    marginBottom: 8,
  },
  backToAllButtonText: {
    fontSize: 15,
    color: colors.accent,
    fontWeight: '600',
  },
  selectedDateText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 40,
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: 16,
    opacity: 0.3,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  agendaSection: {
    marginTop: 16,
  },
  agendaDateHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surface,
  },
  agendaDateHeader: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  addReminderButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: colors.primary,
  },
  addReminderButtonText: {
    color: colors.surface,
    fontSize: 20,
    fontWeight: '300',
  },
  agendaItem: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  agendaItemAccent: {
    width: 4,
  },
  agendaItemContent: {
    flex: 1,
    padding: 16,
  },
  agendaItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  agendaItemTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  agendaItemTime: {
    fontSize: 15,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  agendaItemActions: {
    flexDirection: 'row',
    gap: 12,
  },
  agendaActionButton: {
    padding: 4,
  },
  iconContainer: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editIcon: {
    fontSize: 18,
  },
  deleteIcon: {
    fontSize: 18,
  },
  agendaItemTitle: {
    fontSize: 17,
    color: colors.text,
    fontWeight: '600',
    marginBottom: 6,
  },
  agendaItemTitleCompleted: {
    textDecorationLine: 'line-through',
    color: colors.textSecondary,
  },
  agendaItemDesc: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 8,
  },
  sharedWithContainer: {
    marginBottom: 12,
  },
  agendaItemShared: {
    fontSize: 14,
    color: colors.textTertiary,
    fontWeight: '500',
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.textTertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  checkboxCompleted: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  checkmark: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: '700',
  },
  completeButtonText: {
    fontSize: 15,
    color: colors.text,
    fontWeight: '500',
  },
  completeButtonTextCompleted: {
    color: colors.success,
  },
  // FAB
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  fabText: {
    fontSize: 28,
    color: colors.surface,
    fontWeight: '300',
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  modalHeaderCenter: {
    flex: 1,
    alignItems: 'center',
  },
  modalHeaderButton: {
    fontSize: 17,
    color: colors.accent,
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
    color: colors.text,
    fontWeight: '600',
  },
  modalHeaderActions: {
    flexDirection: 'row',
    gap: 16,
  },
  editButton: {
    padding: 8,
  },
  modalHeaderEdit: {
    fontSize: 17,
    color: colors.accent,
    fontWeight: '600',
  },
  modalHeaderDelete: {
    fontSize: 17,
    color: colors.error,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
  },
  modalTopSection: {
    backgroundColor: colors.surface,
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
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
    color: colors.text,
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
  modalIcon: {
    fontSize: 18,
    marginRight: 8,
    color: colors.textSecondary,
  },
  modalText: {
    fontSize: 16,
    color: colors.text,
  },
  modalSection: {
    backgroundColor: colors.surface,
    padding: 20,
    marginTop: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  modalLabel: {
    fontSize: 15,
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modalDescription: {
    fontSize: 16,
    color: colors.text,
    lineHeight: 22,
  },
  sharedWithItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sharedWithDot: {
    fontSize: 16,
    color: colors.textSecondary,
    marginRight: 8,
  },
  completeButtonModal: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 16,
    borderRadius: 12,
  },
  checkboxModal: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.textTertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxCompletedModal: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  checkmarkModal: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: '700',
  },
  completeButtonTextModal: {
    fontSize: 17,
    color: colors.text,
    fontWeight: '500',
  },
  completeButtonTextCompletedModal: {
    color: colors.success,
  },
  // Create/Edit Modal Styles - RESTORED DROPDOWN
  modalForm: {
    padding: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 15,
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputField: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  // Type Dropdown Styles - RESTORED
  typeSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 15,
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: 8,
  },
  typeDropdownButton: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.divider,
  },
  typeDropdownContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  typeDropdownIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  typeDropdownText: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
  },
  typeDropdownPlaceholder: {
    fontSize: 16,
    color: colors.textTertiary,
  },
  typeDropdownList: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    marginTop: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.divider,
    maxHeight: 280,
  },
  typeDropdownScroll: {
    maxHeight: 280,
  },
  typeDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  typeDropdownItemActive: {
    backgroundColor: colors.background,
  },
  typeDropdownItemIcon: {
    fontSize: 20,
    marginRight: 12,
    width: 28,
  },
  typeDropdownItemText: {
    fontSize: 16,
    color: colors.text,
    flex: 1,
  },
  typeDropdownItemTextActive: {
    fontWeight: '600',
    color: colors.primary,
  },
  typeDropdownItemCheck: {
    fontSize: 18,
    color: colors.accent,
    fontWeight: '700',
  },
  customTypeInput: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: colors.text,
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  timeInputButton: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.divider,
  },
  timeInputText: {
    fontSize: 16,
    color: colors.text,
  },
  timeInputArrow: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  timePickerContainer: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.divider,
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
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  timePickerOptionText: {
    fontSize: 16,
    color: colors.text,
  },
  timePickerOptionTextActive: {
    color: colors.surface,
    fontWeight: '600',
  },
  timePickerDoneButton: {
    padding: 12,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  timePickerDoneButtonText: {
    fontSize: 17,
    color: colors.accent,
    fontWeight: '600',
  },
  inputTextArea: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: colors.text,
    height: 100,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: colors.divider,
  },
  colorPickerSection: {
    marginBottom: 20,
  },
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
    borderColor: colors.text,
    transform: [{ scale: 1.1 }],
  },
  employeeSection: {
    marginBottom: 20,
  },
  selectedEmployeesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  employeeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingLeft: 12,
    paddingRight: 8,
    paddingVertical: 6,
    gap: 4,
  },
  employeeChipText: {
    fontSize: 14,
    color: colors.surface,
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
  employeeChipRemoveText: {
    fontSize: 14,
    color: colors.surface,
    fontWeight: '600',
  },
  addEmployeeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.divider,
    borderStyle: 'dashed',
  },
  addEmployeeButtonIcon: {
    fontSize: 18,
    color: colors.accent,
    marginRight: 8,
  },
  addEmployeeButtonText: {
    fontSize: 16,
    color: colors.accent,
    fontWeight: '500',
  },
  employeeSearchContainer: {
    marginTop: 12,
    backgroundColor: colors.surface,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.divider,
  },
  employeeSearchInput: {
    fontSize: 16,
    color: colors.text,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
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
    borderBottomColor: colors.divider,
  },
  employeeAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 16,
    color: colors.surface,
    fontWeight: '600',
  },
  employeeSearchItemInfo: {
    flex: 1,
  },
  employeeSearchItemName: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
    marginBottom: 2,
  },
  employeeSearchItemRole: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  employeeSearchEmpty: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  employeeSearchEmptyText: {
    fontSize: 15,
    color: colors.textSecondary,
  },
  dropdownIcon: {
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdownArrow: {
    fontSize: 12,
    color: colors.textSecondary,
  },
});

export default Reminder;