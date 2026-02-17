// hr_employee_management/holiday.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Platform,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { WHATSAPP_COLORS } from './constants';
import { BACKEND_URL } from '../../config/config';
import AddHoliday from './addHoliday';
import EditHoliday from './editHoliday';
import alert from '../../utils/Alert';

interface Holiday {
  holiday_id: string | number;
  name: string;
  date: string;
  cities: string[];
  description?: string;
}

interface HolidayManagementProps {
  token: string;
  onBack: () => void;
}

const HolidayManagement: React.FC<HolidayManagementProps> = ({ token, onBack }) => {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddHoliday, setShowAddHoliday] = useState(false);
  const [selectedHoliday, setSelectedHoliday] = useState<Holiday | null>(null);

  useEffect(() => {
    fetchHolidays();
  }, []);

  const fetchHolidays = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/manager/getHolidays`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data.holidays && Array.isArray(data.holidays)) {
          // Map the backend response to our Holiday interface
          const mappedHolidays: Holiday[] = data.holidays.map((holiday: any) => ({
            holiday_id: holiday.id || holiday.holiday_id,
            name: holiday.name,
            date: holiday.date,
            cities: Array.isArray(holiday.cities) ? holiday.cities : [],
            description: holiday.description || '',
          }));
          
          console.log('Mapped holidays:', mappedHolidays.length);
          if (mappedHolidays.length > 0) {
            console.log('First holiday sample:', {
              id: mappedHolidays[0].holiday_id,
              name: mappedHolidays[0].name
            });
          }
          
          // Sort holidays by date
          const sortedHolidays = mappedHolidays.sort((a, b) => 
            new Date(a.date).getTime() - new Date(b.date).getTime()
          );
          
          setHolidays(sortedHolidays);
        } else {
          setHolidays([]);
        }
      } else {
        const errorData = await response.json();
        alert('Error', errorData.message || 'Failed to fetch holidays');
        setHolidays([]);
      }
    } catch (error) {
      console.error('Error fetching holidays:', error);
      alert('Error', 'Network error occurred while fetching holidays');
      setHolidays([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchHolidays();
  }, []);

  const handleHolidayPress = (holiday: Holiday) => {
    console.log('=== Holiday Selected ===');
    console.log('Holiday ID:', holiday.holiday_id);
    console.log('Holiday Name:', holiday.name);
    
    if (!holiday.holiday_id) {
      alert('Error', 'Holiday ID is missing');
      return;
    }
    
    setSelectedHoliday(holiday);
  };

  const handleBackFromAdd = () => {
    setShowAddHoliday(false);
    fetchHolidays();
  };

  const handleBackFromEdit = () => {
    setSelectedHoliday(null);
    fetchHolidays();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
  };

  const getMonthDay = (dateString: string) => {
    const date = new Date(dateString);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return {
      month: months[date.getMonth()],
      day: date.getDate()
    };
  };

  const getHolidayGradient = (index: number) => {
    const gradients = [
      ['#667eea', '#764ba2'],
      ['#f093fb', '#f5576c'],
      ['#4facfe', '#00f2fe'],
      ['#43e97b', '#38f9d7'],
      ['#fa709a', '#fee140'],
      ['#30cfd0', '#330867'],
      ['#a8edea', '#fed6e3'],
      ['#ff9a9e', '#fecfef'],
      ['#ffecd2', '#fcb69f'],
      ['#ff6e7f', '#bfe9ff'],
    ];
    return gradients[index % gradients.length];
  };

  const getHolidayIcon = (name: string) => {
    const nameLower = name.toLowerCase();
    if (nameLower.includes('christmas')) return '🎄';
    if (nameLower.includes('new year')) return '🎊';
    if (nameLower.includes('diwali')) return '🪔';
    if (nameLower.includes('holi')) return '🎨';
    if (nameLower.includes('eid')) return '🌙';
    if (nameLower.includes('independence') || nameLower.includes('republic')) return '🇮🇳';
    if (nameLower.includes('gandhi')) return '🕊️';
    if (nameLower.includes('valentine')) return '❤️';
    if (nameLower.includes('durga')) return '🙏';
    if (nameLower.includes('navratri')) return '💃';
    if (nameLower.includes('ugadi')) return '🌸';
    return '✨';
  };

  const BackIcon = () => (
    <View style={localStyles.backIcon}>
      <View style={localStyles.backArrow} />
      <Text style={localStyles.backText}>Back</Text>
    </View>
  );

  // Show Add Holiday screen
  if (showAddHoliday) {
    return <AddHoliday token={token} onBack={handleBackFromAdd} />;
  }

  // Show Edit Holiday screen
  if (selectedHoliday) {
    console.log('Rendering EditHoliday with:', {
      holiday_id: selectedHoliday.holiday_id,
      name: selectedHoliday.name,
    });
    
    return (
      <EditHoliday
        token={token}
        holiday={selectedHoliday}
        onBack={handleBackFromEdit}
      />
    );
  }

  // Main Holiday List screen
  return (
    <View style={localStyles.container}>
      <ScrollView
        style={localStyles.scrollContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#fff"
            colors={['#fff']}
          />
        }
      >
        {/* Header */}
        <View style={[localStyles.header, localStyles.headerBanner]}>
          <Image
            source={require('../../assets/attendance_bg.jpg')}
            style={localStyles.headerImage}
            resizeMode="cover"
          />
          <View style={localStyles.headerOverlay} />

          <View style={[localStyles.headerContent, { marginTop: Platform.OS === 'ios' ? 20 : 0 }]}>
            <TouchableOpacity style={localStyles.backButton} onPress={onBack}>
              <BackIcon />
            </TouchableOpacity>
            <Text style={localStyles.logoText}>CITADEL</Text>
            <TouchableOpacity 
              style={localStyles.addButton} 
              onPress={() => setShowAddHoliday(true)}
            >
              <Ionicons name="add" size={26} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={localStyles.titleSection}>
            <Text style={localStyles.sectionTitle}>Holidays</Text>
            <Text style={localStyles.sectionSubtitle}>
              {holidays.length} holiday{holidays.length !== 1 ? 's' : ''} scheduled
            </Text>
          </View>
        </View>

        {/* Content */}
        <View style={localStyles.holidaysContent}>
          {loading ? (
            <View style={localStyles.loadingContainer}>
              <ActivityIndicator color="#5b21b6" size="large" />
              <Text style={localStyles.loadingText}>Loading holidays...</Text>
            </View>
          ) : holidays.length > 0 ? (
            holidays.map((holiday, index) => {
              const dateInfo = getMonthDay(holiday.date);
              const gradientColors = getHolidayGradient(index);
              const icon = getHolidayIcon(holiday.name);

              return (
                <TouchableOpacity
                  key={String(holiday.holiday_id)}
                  style={localStyles.holidayCard}
                  onPress={() => handleHolidayPress(holiday)}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={gradientColors}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={localStyles.holidayCardGradient}
                  >
                    <View style={localStyles.holidayCardOverlay} />
                    <View style={localStyles.holidayContent}>
                      <View style={localStyles.holidayLeft}>
                        <View style={localStyles.holidayIconContainer}>
                          <Text style={localStyles.holidayIcon}>{icon}</Text>
                        </View>
                        <View style={localStyles.holidayTextContainer}>
                          <Text style={localStyles.holidayName}>{holiday.name}</Text>
                          <Text style={localStyles.holidayDate}>{formatDate(holiday.date)}</Text>
                          <Text style={localStyles.holidayCities}>
                            {Array.isArray(holiday.cities) 
                              ? holiday.cities.join(', ') 
                              : holiday.cities}
                          </Text>
                        </View>
                      </View>
                      <View style={localStyles.dateBadge}>
                        <Text style={localStyles.dateBadgeMonth}>{dateInfo.month}</Text>
                        <Text style={localStyles.dateBadgeDay}>{dateInfo.day}</Text>
                      </View>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              );
            })
          ) : (
            <View style={localStyles.emptyState}>
              <View style={localStyles.emptyStateIconContainer}>
                <Text style={localStyles.emptyStateIcon}>📅</Text>
              </View>
              <Text style={localStyles.emptyStateTitle}>No Holidays Added</Text>
              <Text style={localStyles.emptyStateText}>
                Add holidays for your organization by tapping the + button above
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const localStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#e7e6e5',
  },
  scrollContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
    zIndex: 10,
  },
  addButton: {
    padding: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    zIndex: 10,
    marginTop: 8,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 30,
    width: '96%',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 2,
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
    paddingVertical: 0,
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    zIndex: 2,
  },
  sectionTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 4,
  },
  headerBanner: {
    height: 250,
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
    opacity: 1,
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    zIndex: 1,
  },
  holidaysContent: {
    padding: 20,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 12,
    fontWeight: '500',
  },
  holidayCard: {
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  holidayCardGradient: {
    padding: 0,
    position: 'relative',
  },
  holidayCardOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  holidayContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  holidayLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  holidayIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  holidayIcon: {
    fontSize: 32,
  },
  holidayTextContainer: {
    flex: 1,
  },
  holidayName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  holidayDate: {
    fontSize: 13,
    color: '#fff',
    opacity: 0.95,
    fontWeight: '500',
    marginBottom: 4,
  },
  holidayCities: {
    fontSize: 11,
    color: '#fff',
    opacity: 0.85,
    fontWeight: '500',
  },
  dateBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 14,
    padding: 12,
    minWidth: 64,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dateBadgeMonth: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  dateBadgeDay: {
    fontSize: 26,
    fontWeight: '800',
    color: '#111827',
    lineHeight: 30,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyStateIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f3f0ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyStateIcon: {
    fontSize: 48,
  },
  emptyStateTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  backIcon: {
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    display: 'flex',
    flexDirection: 'row',
    alignContent: 'center'
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
    fontSize: 16,
    marginLeft: 2,
  },
});

export default HolidayManagement;