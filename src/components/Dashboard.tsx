import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface DashboardProps {
  onLogout: () => void;
}

interface AttendanceCardProps {
  value: string;
  label: string;
}

interface EventAvatarProps {
  name: string;
  date: string;
  initials: string;
}

interface UpcomingEvent {
  name: string;
  date: string;
  initials: string;
}

const Dashboard: React.FC<DashboardProps> = ({ onLogout }) => {
  const insets = useSafeAreaInsets();
  
  const upcomingEvents: UpcomingEvent[] = [
    { name: 'Priyanka C', date: '25 Jul', initials: 'PC' },
    { name: 'Ashritha', date: '26 Jul', initials: 'AS' },
    { name: 'Sushma', date: '1 Aug', initials: 'SU' },
    { name: 'Biju Unni', date: '19 Aug', initials: 'BU' },
    { name: 'Priyanka Raj', date: '19 Aug', initials: 'PR' },
  ];

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: onLogout,
        },
      ]
    );
  };

  const AttendanceCard = ({ value, label }: AttendanceCardProps) => (
    <View style={styles.card}>
      <Text style={styles.cardValue}>{value}</Text>
      <Text style={styles.cardLabel}>{label}</Text>
    </View>
  );

  const EventAvatar = ({ name, date, initials }: EventAvatarProps) => (
    <View style={styles.eventContainer}>
      <View style={styles.avatarContainer}>
        <View style={styles.avatar}>
          <Text style={styles.avatarInitials}>{initials}</Text>
        </View>
        <View style={styles.dateBadge}>
          <Text style={styles.dateText}>{date}</Text>
        </View>
      </View>
      <Text style={styles.eventName}>{name}</Text>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor="#2D3748" />
      
      {/* Header Section */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.menuIcon}>
            <View style={styles.menuLine} />
            <View style={styles.menuLine} />
            <View style={styles.menuLine} />
          </TouchableOpacity>
          
          <View style={styles.logoContainer}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoText}>C</Text>
            </View>
            <Text style={styles.logoName}>CITADEL</Text>
          </View>
          
          <TouchableOpacity 
            style={styles.logoutButton}
            onPress={handleLogout}
          >
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.userInfo}>
          <View style={styles.userDetails}>
            <Text style={styles.userRole}>Director</Text>
            <Text style={styles.userName}>Priyanka Raj</Text>
          </View>
          <TouchableOpacity style={styles.userAvatarButton}>
            <View style={styles.userAvatarCircle}>
              <Text style={styles.userAvatarIcon}>👤</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content - White Background */}
      <View style={styles.mainContent}>
        <ScrollView 
          style={styles.scrollContent} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContainer}
        >
          {/* Attendance Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.blueBar} />
              <Text style={styles.sectionTitle}>Attendance</Text>
            </View>

            <View style={styles.cardGrid}>
              <View style={styles.cardRow}>
                <AttendanceCard value="261" label="Days Present" />
                <AttendanceCard value="3" label="Leaves Applied" />
              </View>
              <View style={styles.cardRow}>
                <AttendanceCard value="7" label="Holidays" />
                <AttendanceCard value="0" label="Late" />
              </View>
            </View>

            <TouchableOpacity style={styles.applyButton} activeOpacity={0.8}>
              <Text style={styles.applyButtonText}>Apply Leave</Text>
            </TouchableOpacity>
          </View>

          {/* Upcoming Events Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.blueBar} />
              <Text style={styles.sectionTitle}>Upcoming Birthday & Anniversary</Text>
            </View>

            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.eventsScroll}
            >
              {upcomingEvents.map((event, index) => (
                <EventAvatar
                  key={index}
                  name={event.name}
                  date={event.date}
                  initials={event.initials}
                />
              ))}
            </ScrollView>
          </View>
        </ScrollView>

        {/* Bottom Navigation */}
        <View style={[styles.bottomNav, { paddingBottom: insets.bottom }]}>
          <TouchableOpacity style={styles.navItem}>
            <Text style={styles.navIconActive}>🏠</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem}>
            <Text style={styles.navIcon}>📅</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem}>
            <Text style={styles.navIcon}>📍</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem}>
            <Text style={styles.navIcon}>🤝</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem}>
            <Text style={styles.navIcon}>👥</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2D3748', 
  },
  header: {
    backgroundColor: '#2D3748',
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 12,
  },
  menuIcon: {
    padding: 4,
  },
  menuLine: {
    width: 18,
    height: 2,
    backgroundColor: 'white',
    marginVertical: 2,
    borderRadius: 1,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoCircle: {
    width: 32,
    height: 32,
    backgroundColor: 'white',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  logoText: {
    color: '#2D3748',
    fontSize: 14,
    fontWeight: 'bold',
  },
  logoName: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 1,
  },
  logoutButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  logoutText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  userInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userDetails: {
    flex: 1,
  },
  userRole: {
    color: '#A0AEC0',
    fontSize: 14,
    marginBottom: 2,
  },
  userName: {
    color: 'white',
    fontSize: 24,
    fontWeight: '600',
  },
  userAvatarButton: {
    padding: 4,
  },
  userAvatarCircle: {
    width: 44,
    height: 44,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatarIcon: {
    fontSize: 20,
  },
  mainContent: {
    flex: 1,
    backgroundColor: '#F7FAFC',
  },
  scrollContent: {
    flex: 1,
  },
  scrollContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  blueBar: {
    width: 4,
    height: 20,
    backgroundColor: '#4299E1',
    borderRadius: 2,
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D3748',
  },
  cardGrid: {
    marginBottom: 20,
  },
  cardRow: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 12,
  },
  card: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#2D3748',
    marginBottom: 4,
  },
  cardLabel: {
    fontSize: 14,
    color: '#718096',
    textAlign: 'center',
  },
  applyButton: {
    backgroundColor: '#2D3748',
    borderRadius: 24,
    paddingVertical: 16,
    alignItems: 'center',
  },
  applyButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  eventsScroll: {
    marginTop: 8,
  },
  eventContainer: {
    alignItems: 'center',
    marginRight: 16,
    width: 70,
  },
  avatarContainer: {
    position: 'relative',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 60,
    height: 60,
    backgroundColor: '#4299E1',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  dateBadge: {
    position: 'absolute',
    bottom: -8,
    backgroundColor: '#2D3748',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 40,
    alignItems: 'center',
  },
  dateText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '500',
  },
  eventName: {
    fontSize: 12,
    color: '#4A5568',
    textAlign: 'center',
    lineHeight: 16,
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  navIcon: {
    fontSize: 22,
    opacity: 0.4,
  },
  navIconActive: {
    fontSize: 22,
    opacity: 1,
  },
});

export default Dashboard;