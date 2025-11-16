import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView,
  StatusBar, Modal, TextInput, Dimensions, ActivityIndicator, Alert
} from 'react-native';

const PREVIEW_MODE = true;
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

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
  cardGreen: '#A7F3D0',
  cardOrange: '#FED7AA',
  cardPurple: '#DDD6FE',
  cardPink: '#FBCFE8',
  blue: '#007AFF',
  green: '#34C759',
};

interface ReminderProps {
  onBack: () => void;
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
  created_by: {
    employee_id: string;
    full_name: string;
  };
}

type ViewMode = 'month' | 'agenda';

const Reminder: React.FC<ReminderProps> = ({ onBack }) => {
  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedReminder, setSelectedReminder] = useState<ReminderItem | null>(null);
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
  const [selectedPeriod, setSelectedPeriod] = useState<'AM' | 'PM'>('AM');
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedColor, setSelectedColor] = useState(colors.blue);
  const [submitting, setSubmitting] = useState(false);

  const hours = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'));
  const minutes = ['00', '15', '30', '45'];
  
  const eventColors = [colors.blue, colors.green, colors.cardOrange, colors.cardPurple, colors.error, colors.cardPink];

  useEffect(() => {
    if (PREVIEW_MODE) {
      const today = new Date();
      const demoReminders: ReminderItem[] = [
        {
          id: 1,
          title: 'Team Meeting',
          description: 'Quarterly review',
          reminder_date: today.toISOString().split('T')[0],
          reminder_time: '10:00:00',
          is_completed: false,
          created_at: today.toISOString(),
          updated_at: today.toISOString(),
          also_share_with: [],
          created_by: { employee_id: '001', full_name: 'John Doe' }
        },
        {
          id: 2,
          title: 'Project Deadline',
          description: 'Submit final report',
          reminder_date: new Date(today.getTime() + 86400000 * 3).toISOString().split('T')[0],
          reminder_time: '17:00:00',
          is_completed: false,
          created_at: today.toISOString(),
          updated_at: today.toISOString(),
          also_share_with: [],
          created_by: { employee_id: '001', full_name: 'John Doe' }
        }
      ];
      setReminders(demoReminders);
    }
  }, []);

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
  };

  const isDateBeforeToday = (dateStr: string): boolean => {
    const selectedDate = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    selectedDate.setHours(0, 0, 0, 0);
    return selectedDate < today;
  };

  const handleCreateReminder = () => {
    if (!title.trim()) {
      Alert.alert('Required Field', 'Please enter a title for your reminder');
      return;
    }
    if (!date) {
      Alert.alert('Required Field', 'Please select a date');
      return;
    }
    if (isDateBeforeToday(date)) {
      Alert.alert('Invalid Date', 'Cannot create reminder for past dates');
      return;
    }
    
    let hour24 = parseInt(selectedHour);
    if (selectedPeriod === 'PM' && hour24 !== 12) hour24 += 12;
    else if (selectedPeriod === 'AM' && hour24 === 12) hour24 = 0;
    
    const timeString = `${hour24.toString().padStart(2, '0')}:${selectedMinute}:00`;

    const newReminder: ReminderItem = {
      id: Date.now(),
      title: title.trim(),
      description: description.trim(),
      reminder_date: date,
      reminder_time: timeString,
      is_completed: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      also_share_with: [],
      created_by: { employee_id: '001', full_name: 'You' }
    };

    setReminders([...reminders, newReminder]);
    setShowCreateModal(false);
    resetForm();
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
          onPress: () => {
            setReminders(reminders.filter(r => r.id !== reminderId));
            setShowDetailModal(false);
            setSelectedReminder(null);
          },
        },
      ]
    );
  };

  const openDetailModal = (reminder: ReminderItem) => {
    setSelectedReminder(reminder);
    setShowDetailModal(true);
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
    const h = parseInt(hours);
    const period = h >= 12 ? 'PM' : 'AM';
    const displayHour = h % 12 || 12;
    return `${displayHour}:${minutes} ${period}`;
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
    return reminders.filter(r => r.reminder_date.startsWith(dateStr));
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
          activeOpacity={0.7}
        >
          <View style={[styles.dayNumberContainer, isToday && styles.dayNumberToday]}>
            <Text style={[styles.dayNumber, isToday && styles.dayNumberTodayText, isPast && styles.dayNumberPast]}>
              {day}
            </Text>
          </View>
          {dayReminders.length > 0 && (
            <View style={styles.dayEventsContainer}>
              {dayReminders.slice(0, 2).map((reminder) => (
                <View
                  key={reminder.id}
                  style={[styles.dayEventDot, { backgroundColor: eventColors[reminder.id % eventColors.length] }]}
                />
              ))}
              {dayReminders.length > 2 && (
                <Text style={styles.moreEventsText}>+{dayReminders.length - 2}</Text>
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
      const dateA = new Date(`${a.reminder_date}T${a.reminder_time}`);
      const dateB = new Date(`${b.reminder_date}T${b.reminder_time}`);
      return dateA.getTime() - dateB.getTime();
    });

    const groupedReminders: { [key: string]: ReminderItem[] } = {};
    sortedReminders.forEach(reminder => {
      if (!groupedReminders[reminder.reminder_date]) {
        groupedReminders[reminder.reminder_date] = [];
      }
      groupedReminders[reminder.reminder_date].push(reminder);
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
                  <View style={[styles.agendaItemAccent, { backgroundColor: eventColors[reminder.id % eventColors.length] }]} />
                  <View style={styles.agendaItemContent}>
                    <Text style={styles.agendaItemTitle}>{reminder.title}</Text>
                    <Text style={styles.agendaItemTime}>{formatTime(reminder.reminder_time)}</Text>
                    {reminder.description && (
                      <Text style={styles.agendaItemDesc} numberOfLines={2}>
                        {reminder.description}
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
              <TouchableOpacity
                onPress={() => handleDeleteReminder(selectedReminder.id)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalHeaderDelete}>Delete</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalContent}>
              <View style={[styles.modalColorBar, { backgroundColor: eventColors[selectedReminder.id % eventColors.length] }]} />
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
            </ScrollView>
          </SafeAreaView>
        )}
      </Modal>

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
            <Text style={styles.modalHeaderTitle}>New Reminder</Text>
            <TouchableOpacity onPress={handleCreateReminder} disabled={submitting} activeOpacity={0.7}>
              <Text style={[styles.modalHeaderButton, styles.modalHeaderButtonPrimary]}>Add</Text>
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
                  {selectedHour}:{selectedMinute} {selectedPeriod}
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

                    <View style={styles.timePickerColumn}>
                      <Text style={styles.timePickerLabel}>Period</Text>
                      {['AM', 'PM'].map(period => (
                        <TouchableOpacity
                          key={period}
                          style={[
                            styles.timePickerOption,
                            selectedPeriod === period && styles.timePickerOptionActive
                          ]}
                          onPress={() => setSelectedPeriod(period as 'AM' | 'PM')}
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

            <View style={styles.colorPickerSection}>
              <Text style={styles.inputLabel}>Color</Text>
              <View style={styles.colorPickerRow}>
                {eventColors.map(color => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.colorOption,
                      { backgroundColor: color },
                      selectedColor === color && styles.colorOptionSelected
                    ]}
                    onPress={() => setSelectedColor(color)}
                    activeOpacity={0.7}
                  />
                ))}
              </View>
            </View>
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
  modalHeaderDelete: {
    fontSize: 17,
    color: colors.error,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 4,
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