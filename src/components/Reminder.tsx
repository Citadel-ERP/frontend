import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView,
  StatusBar, Modal, TextInput, Dimensions, ActivityIndicator, Alert, FlatList
} from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Import these from your config
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BACKEND_URL } from '../config/config';
const TOKEN_KEY = 'token_2';


const colors = {
  primary: '#161b34',
  primaryLight: '#2a3150',
  accent: '#007AFF',
  surface: '#FFFFFF',
  background: '#F7FAFC',
  text: '#1a202c',
  textSecondary: '#5f6368',
  textTertiary: '#A0AEC0',
  divider: '#E5E5EA',
  error: '#DC3545',
  success: '#34C759',
  blue: '#007AFF',
  green: '#34C759',
  orange: '#FF9500',
  purple: '#AF52DE',
  pink: '#FF2D55',
  yellow: '#FFCC00',
};

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
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  // Employee selection states
  const [selectedEmployees, setSelectedEmployees] = useState<Employee[]>([]);
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState('');
  const [employeeSearchResults, setEmployeeSearchResults] = useState<Employee[]>([]);
  const [showEmployeeSearch, setShowEmployeeSearch] = useState(false);
  const [searchingEmployees, setSearchingEmployees] = useState(false);

  // Generate hours (00-23) and minutes (00-59)
  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));
  
  const eventColors = [
    { name: 'blue', value: colors.blue },
    { name: 'green', value: colors.green },
    { name: 'orange', value: colors.orange },
    { name: 'purple', value: colors.purple },
    { name: 'pink', value: colors.pink },
    { name: 'yellow', value: colors.yellow },
  ];

  // Get token on mount
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

  // Fetch reminders when token is available
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
        // Filter out already selected employees
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
    setSelectedColor('');
    setSelectedDate(null);
    setShowTimePicker(false);
    setSelectedEmployees([]);
    setEmployeeSearchQuery('');
    setEmployeeSearchResults([]);
    setShowEmployeeSearch(false);
    setIsEditMode(false);
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

  const handleCreateReminder = async () => {
    if (!title.trim()) {
      Alert.alert('Required Field', 'Please enter a title for your reminder');
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

    const timeString = `${selectedHour}:${selectedMinute}:00`;
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
          title: title.trim(),
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
    if (!selectedReminder || !title.trim() || !date || !selectedColor) {
      Alert.alert('Required Fields', 'Please fill all required fields');
      return;
    }

    const timeString = `${selectedHour}:${selectedMinute}:00`;
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
          title: title.trim(),
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
    
    const [hours, minutes] = selectedReminder.reminder_time.split(':');
    setSelectedHour(hours);
    setSelectedMinute(minutes);
    
    setSelectedColor(getColorValue(selectedReminder.color));
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

    setSelectedDate(dateObj);
    setDate(dateObj.toISOString().split('T')[0]);
    setShowCreateModal(true);
  };

  const formatDate = (dateString: string): string => {
    const d = new Date(dateString);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatTime = (timeString: string): string => {
    const [hours, minutes] = timeString.split(':');
    return `${hours}:${minutes}`;
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

  const getRemindersForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
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
              openDetailModal(dayReminders[0]);
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
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
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
    const sortedReminders = [...filteredReminders].sort((a, b) => {
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
      <ScrollView style={styles.agendaView} showsVerticalScrollIndicator={false}>
        {Object.keys(groupedReminders).length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>📅</Text>
            <Text style={styles.emptyStateTitle}>No Reminders</Text>
            <Text style={styles.emptyStateSubtitle}>Tap any date to create one</Text>
          </View>
        ) : (
          Object.keys(groupedReminders).map(dateKey => (
            <View key={dateKey} style={styles.agendaSection}>
              <Text style={styles.agendaDateHeader}>{formatDate(dateKey)}</Text>
              {groupedReminders[dateKey].map((reminder) => (
                <TouchableOpacity
                  key={reminder.id}
                  style={styles.agendaItem}
                  onPress={() => openDetailModal(reminder)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.agendaItemAccent, { backgroundColor: getColorValue(reminder.color) }]} />
                  <View style={styles.agendaItemContent}>
                    <Text style={styles.agendaItemTitle}>{reminder.title}</Text>
                    <Text style={styles.agendaItemTime}>{formatTime(reminder.reminder_time)}</Text>
                    {reminder.description && (
                      <Text style={styles.agendaItemDesc} numberOfLines={2}>
                        {reminder.description}
                      </Text>
                    )}
                    {reminder.also_share_with.length > 0 && (
                      <Text style={styles.agendaItemShared}>
                        Shared with {reminder.also_share_with.length} {reminder.also_share_with.length === 1 ? 'person' : 'people'}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ))
        )}
        <View style={{ height: 100 }} />
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Calendar</Text>
        <TouchableOpacity
          style={styles.searchButton}
          onPress={() => setShowSearch(!showSearch)}
          activeOpacity={0.7}
        >
          <Text style={styles.searchButtonText}>⌕</Text>
        </TouchableOpacity>
      </View>

      {showSearch && (
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search reminders"
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={colors.textTertiary}
          />
        </View>
      )}

      <View style={styles.toolbar}>
        <TouchableOpacity style={styles.todayButton} onPress={goToToday} activeOpacity={0.7}>
          <Text style={styles.todayButtonText}>Today</Text>
        </TouchableOpacity>

        <View style={styles.monthNavigation}>
          <TouchableOpacity onPress={() => changeMonth(-1)} activeOpacity={0.7} style={styles.navButton}>
            <Text style={styles.navArrow}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.monthYearText}>
            {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </Text>
          <TouchableOpacity onPress={() => changeMonth(1)} activeOpacity={0.7} style={styles.navButton}>
            <Text style={styles.navArrow}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.viewToggle}>
          <TouchableOpacity
            style={[styles.viewToggleButton, viewMode === 'month' && styles.viewToggleButtonActive]}
            onPress={() => setViewMode('month')}
            activeOpacity={0.7}
          >
            <Text style={[styles.viewToggleText, viewMode === 'month' && styles.viewToggleTextActive]}>
              Month
            </Text>
          </TouchableOpacity>
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

      <View style={styles.content}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <>
            {viewMode === 'month' && <MonthView />}
            {viewMode === 'agenda' && <AgendaView />}
          </>
        )}
      </View>

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
              <Text style={styles.modalHeaderTitle}>Reminder Details</Text>
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
            <ScrollView style={styles.modalContent}>
              <View style={[styles.modalColorBar, { backgroundColor: getColorValue(selectedReminder.color) }]} />
              <Text style={styles.modalTitle}>{selectedReminder.title}</Text>
              
              <View style={styles.modalSection}>
                <View style={styles.modalRow}>
                  <Text style={styles.modalIcon}>📅</Text>
                  <Text style={styles.modalText}>{formatDate(selectedReminder.reminder_date)}</Text>
                </View>
                <View style={styles.modalRow}>
                  <Text style={styles.modalIcon}>🕐</Text>
                  <Text style={styles.modalText}>{formatTime(selectedReminder.reminder_time)}</Text>
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
                    <Text key={idx} style={styles.modalText}>• {empId}</Text>
                  ))}
                </View>
              )}
            </ScrollView>
          </SafeAreaView>
        )}
      </Modal>

      {/* Create/Edit Modal */}
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
              <Text style={[styles.modalHeaderButton, styles.modalHeaderButtonPrimary]}>
                {submitting ? 'Saving...' : isEditMode ? 'Update' : 'Add'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} keyboardShouldPersistTaps="handled">
            <TextInput
              style={styles.inputTitle}
              placeholder="Title"
              value={title}
              onChangeText={setTitle}
              placeholderTextColor={colors.textTertiary}
              autoFocus
            />

            <View style={styles.inputGroup}>
              <View style={styles.inputRow}>
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

              <View style={styles.inputDivider} />

              <TouchableOpacity
                style={styles.inputRow}
                onPress={() => setShowTimePicker(!showTimePicker)}
                activeOpacity={0.7}
              >
                <Text style={styles.inputLabel}>Time</Text>
                <Text style={styles.inputValue}>
                  {selectedHour}:{selectedMinute}
                </Text>
              </TouchableOpacity>

              {showTimePicker && (
                <View style={styles.timePickerContainer}>
                  <View style={styles.timePickerRow}>
                    <View style={styles.timePickerColumn}>
                      <Text style={styles.timePickerLabel}>Hour</Text>
                      <ScrollView style={styles.timePickerScroll} showsVerticalScrollIndicator={false}>
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
                    </View>

                    <View style={styles.timePickerColumn}>
                      <Text style={styles.timePickerLabel}>Min</Text>
                      <ScrollView style={styles.timePickerScroll} showsVerticalScrollIndicator={false}>
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
                    </View>
                  </View>
                </View>
              )}

              <View style={styles.inputDivider} />

              <View style={styles.inputRow}>
                <Text style={styles.inputLabel}>Notes</Text>
              </View>
              <TextInput
                style={styles.inputTextArea}
                placeholder="Add notes"
                value={description}
                onChangeText={setDescription}
                multiline
                placeholderTextColor={colors.textTertiary}
              />
            </View>

            {/* Employee Selection */}
            <View style={styles.employeeSection}>
              <Text style={styles.sectionTitle}>Share With Employees</Text>
              
              {selectedEmployees.length > 0 && (
                <View style={styles.selectedEmployeesContainer}>
                  {selectedEmployees.map((emp) => (
                    <View key={emp.employee_id} style={styles.employeeChip}>
                      <Text style={styles.employeeChipText}>{emp.full_name}</Text>
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
                <Text style={styles.addEmployeeButtonText}>+ Add Employee</Text>
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
                    <ScrollView style={styles.employeeSearchResults} nestedScrollEnabled>
                      {employeeSearchResults.map((emp) => (
                        <TouchableOpacity
                          key={emp.employee_id}
                          style={styles.employeeSearchItem}
                          onPress={() => addEmployee(emp)}
                          activeOpacity={0.7}
                        >
                          <View style={styles.employeeSearchItemInfo}>
                            <Text style={styles.employeeSearchItemName}>{emp.full_name}</Text>
                            <Text style={styles.employeeSearchItemRole}>
                              {emp.role} • {emp.employee_id}
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

            {/* Color Picker */}
            <View style={styles.colorPickerSection}>
              <Text style={styles.sectionTitle}>
                Color {!selectedColor && <Text style={styles.requiredStar}>*</Text>}
              </Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: colors.primary,
  },
  backButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 24,
    color: colors.surface,
    fontWeight: '300',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.surface,
  },
  searchButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchButtonText: {
    fontSize: 22,
    color: colors.surface,
    fontWeight: '400',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.primaryLight,
  },
  searchInput: {
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 10,
    paddingHorizontal: 16,
    fontSize: 16,
    color: colors.surface,
  },
  toolbar: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  todayButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  todayButtonText: {
    fontSize: 12,
    color: colors.surface,
    fontWeight: '600',
  },
  monthNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
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
    fontSize: 22,
    color: colors.primary,
    fontWeight: '600',
  },
  monthYearText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    flex: 1,
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: 10,
    padding: 3,
    alignSelf: 'center',
  },
  viewToggleButton: {
    paddingHorizontal: 18,
    paddingVertical: 6,
    borderRadius: 8,
    minWidth: 75,
    alignItems: 'center',
  },
  viewToggleButtonActive: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  viewToggleText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  viewToggleTextActive: {
    color: colors.surface,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '700',
    letterSpacing: 0.5,
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
    aspectRatio: 0.9,
    padding: 4,
    alignItems: 'center',
    justifyContent: 'flex-start',
    borderRightWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.divider,
  },
  dayNumberContainer: {
    width: '80%',
    aspectRatio: 1,
    maxWidth: 40,
    maxHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    marginBottom: 4,
  },
  dayNumberToday: {
    backgroundColor: colors.primary,
  },
  dayNumber: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '600',
  },
  dayNumberTodayText: {
    color: colors.surface,
    fontWeight: '700',
  },
  dayNumberPast: {
    color: colors.textTertiary,
    opacity: 0.5,
  },
  dayEventsContainer: {
    flexDirection: 'row',
    gap: 3,
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayEventDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  moreEventsText: {
    fontSize: 9,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  agendaView: {
    flex: 1,
    backgroundColor: colors.background,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 120,
    paddingHorizontal: 40,
  },
  emptyStateIcon: {
    fontSize: 80,
    marginBottom: 20,
    opacity: 0.4,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  agendaSection: {
    marginTop: 20,
  },
  agendaDateHeader: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  agendaItem: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  agendaItemAccent: {
    width: 5,
  },
  agendaItemContent: {
    flex: 1,
    padding: 16,
  },
  agendaItemTitle: {
    fontSize: 17,
    color: colors.text,
    fontWeight: '600',
    marginBottom: 6,
  },
  agendaItemTime: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  agendaItemDesc: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 4,
  },
  agendaItemShared: {
    fontSize: 12,
    color: colors.accent,
    fontWeight: '500',
    marginTop: 4,
  },
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
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
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
  modalHeaderTitle: {
    fontSize: 17,
    color: colors.text,
    fontWeight: '600',
  },
  modalHeaderActions: {
    flexDirection: 'row',
    gap: 12,
  },
  editButton: {
    marginRight: 4,
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
    paddingTop: 24,
  },
  modalColorBar: {
    height: 4,
    marginHorizontal: 16,
    borderRadius: 2,
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text,
    paddingHorizontal: 16,
    marginBottom: 28,
  },
  modalSection: {
    marginBottom: 28,
    paddingHorizontal: 16,
  },
  modalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalIcon: {
    fontSize: 22,
    marginRight: 12,
    width: 32,
  },
  modalText: {
    fontSize: 17,
    color: colors.text,
  },
  modalLabel: {
    fontSize: 17,
    color: colors.text,
    fontWeight: '600',
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 17,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  inputTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 20,
  },
  inputGroup: {
    backgroundColor: colors.surface,
    marginHorizontal: 16,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 24,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  inputLabel: {
    fontSize: 17,
    color: colors.text,
    fontWeight: '500',
  },
  inputField: {
    fontSize: 17,
    color: colors.textSecondary,
    textAlign: 'right',
    flex: 1,
    marginLeft: 16,
  },
  inputValue: {
    fontSize: 17,
    color: colors.textSecondary,
  },
  inputDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.divider,
    marginLeft: 16,
  },
  inputTextArea: {
    fontSize: 17,
    color: colors.text,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  timePickerContainer: {
    paddingVertical: 16,
    backgroundColor: colors.background,
  },
  timePickerRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
  },
  timePickerColumn: {
    flex: 1,
  },
  timePickerLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  timePickerScroll: {
    maxHeight: 150,
    backgroundColor: colors.surface,
    borderRadius: 8,
  },
  timePickerOption: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  timePickerOptionActive: {
    backgroundColor: colors.primary,
  },
  timePickerOptionText: {
    fontSize: 17,
    color: colors.text,
  },
  timePickerOptionTextActive: {
    color: colors.surface,
    fontWeight: '600',
  },
  employeeSection: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 17,
    color: colors.text,
    fontWeight: '600',
    marginBottom: 12,
  },
  requiredStar: {
    color: colors.error,
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
    backgroundColor: colors.primaryLight,
    borderRadius: 20,
    paddingLeft: 14,
    paddingRight: 8,
    paddingVertical: 8,
    gap: 6,
  },
  employeeChipText: {
    fontSize: 14,
    color: colors.surface,
    fontWeight: '500',
  },
  employeeChipRemove: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  employeeChipRemoveText: {
    fontSize: 18,
    color: colors.surface,
    fontWeight: '600',
    lineHeight: 20,
  },
  addEmployeeButton: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.divider,
    borderStyle: 'dashed',
  },
  addEmployeeButtonText: {
    fontSize: 15,
    color: colors.accent,
    fontWeight: '600',
  },
  employeeSearchContainer: {
    marginTop: 12,
    backgroundColor: colors.surface,
    borderRadius: 12,
    overflow: 'hidden',
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
  employeeSearchItemInfo: {
    flex: 1,
  },
  employeeSearchItemName: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '600',
    marginBottom: 2,
  },
  employeeSearchItemRole: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  employeeSearchEmpty: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  employeeSearchEmptyText: {
    fontSize: 15,
    color: colors.textSecondary,
  },
  colorPickerSection: {
    paddingHorizontal: 16,
    marginBottom: 32,
  },
  colorPickerRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 12,
  },
  colorOption: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  colorOptionSelected: {
    borderColor: colors.primary,
    transform: [{ scale: 1.1 }],
  },
});

export default Reminder;