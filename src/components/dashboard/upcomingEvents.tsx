import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

interface UpcomingEvent {
  full_name: string;
  date: string;
  type: 'birthday' | 'anniversary';
  years?: number;
  anniversaryYears?: number;
}

interface UpcomingEventsProps {
  upcomingEvents: UpcomingEvent[];
  theme: any;
  currentColors: any;
  getInitials: (fullName: string) => string;
  formatEventDate: (dateString: string) => { day: string, month: string, year?: string };
  formatAnniversaryYears: (years: number) => string;
}

const UpcomingEvents: React.FC<UpcomingEventsProps> = ({
  upcomingEvents,
  theme,
  currentColors,
  getInitials,
  formatEventDate,
  formatAnniversaryYears,
}) => {
  return (
    <View style={[styles.sectionCard, { backgroundColor: theme.cardBg }]}>
      <Text style={[styles.labelSmall, { color: theme.textSub }]}>UPCOMING EVENTS</Text>
      {upcomingEvents.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.eventsScroll}
          contentContainerStyle={styles.eventsScrollContent}
        >
          {upcomingEvents.map((event, index) => {
            const formattedDate = formatEventDate(event.date);
            return (
              <View key={index} style={styles.eventItem}>
                <View style={[styles.eventCard, { backgroundColor: 'transparent' }]}>
                  <View style={styles.eventAvatarWrapper}>
                    <View style={[
                      styles.eventAvatar,
                      {
                        backgroundColor: event.type === 'anniversary' ? '#8B5CF6' : currentColors.primaryBlue,
                        width: 70,
                        height: 70,
                      }
                    ]}>
                      <Text style={[styles.eventAvatarInitials, { fontSize: 20 }]}>
                        {getInitials(event.full_name)}
                      </Text>
                    </View>
                    <View style={[
                      styles.eventDateBadge,
                      {
                        top: -5,
                        right: -5,
                        backgroundColor: theme.cardBg,
                        paddingHorizontal: 6,
                        paddingVertical: 4,
                        borderRadius: 6,
                      }
                    ]}>
                      <Text style={[styles.eventDateDay, { fontSize: 12 }]}>{formattedDate.day}</Text>
                      <Text style={[styles.eventDateMonth, { fontSize: 9 }]}>{formattedDate.month}</Text>
                    </View>
                    {event.type === 'anniversary' && event.anniversaryYears && (
                      <View style={[
                        styles.anniversaryBadge,
                        {
                          bottom: -5,
                          left: -5,
                        }
                      ]}>
                        <Text style={[styles.anniversaryText, { fontSize: 9 }]}>
                          {formatAnniversaryYears(event.anniversaryYears)}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.eventName, { color: theme.textMain, fontSize: 12, marginTop: 8 }]} numberOfLines={1}>
                    {event.full_name}
                  </Text>
                  <View style={[styles.eventTypeContainer, { marginTop: 4 }]}>
                    <Ionicons
                      name={event.type === 'birthday' ? "ice-cream" : "briefcase-outline"}
                      size={12}
                      color={theme.textSub}
                    />
                    <Text style={[styles.eventType, { color: theme.textSub, fontSize: 10, marginLeft: 4 }]}>
                      {event.type === 'birthday' ? 'Birthday' : 'Anniversary'}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}
        </ScrollView>
      ) : (
        <View style={styles.noEventsContainer}>
          <Ionicons
            name="calendar-outline"
            size={50}
            color={currentColors.primaryBlue}
            style={styles.noEventsIcon}
          />
          <Text style={[styles.noEventsText, { color: theme.textMain }]}>
            No upcoming events
          </Text>
          <Text style={[styles.noEventsSubtext, { color: theme.textSub }]}>
            in the next 3 months
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  sectionCard: {
    marginHorizontal: 20,
    marginBottom: 15,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 3,
  },
  labelSmall: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
    fontWeight: '600',
  },
  eventsScroll: {
    marginHorizontal: -5,
    minHeight: 160,
  },
  eventsScrollContent: {
    paddingHorizontal: 5,
  },
  eventItem: {
    marginHorizontal: 8,
    width: 100,
  },
  eventCard: {
    alignItems: 'center',
  },
  eventAvatarWrapper: {
    position: 'relative',
    marginBottom: 0,
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventAvatar: {
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  eventAvatarInitials: {
    color: 'white',
    fontWeight: 'bold',
  },
  eventDateBadge: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  eventDateDay: {
    color: '#FF5E7A',
    fontWeight: '700',
    lineHeight: 14,
  },
  eventDateMonth: {
    color: '#666666',
    fontWeight: '600',
    lineHeight: 11,
  },
  anniversaryBadge: {
    position: 'absolute',
    backgroundColor: '#FCD34D',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  anniversaryText: {
    color: '#78350F',
    fontWeight: '700',
  },
  eventName: {
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 14,
  },
  eventTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventType: {
    textAlign: 'center',
    fontWeight: '500',
  },
  noEventsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingVertical: 30,
    minHeight: 150,
  },
  noEventsIcon: {
    marginBottom: 15,
    opacity: 0.6,
  },
  noEventsText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  noEventsSubtext: {
    fontSize: 13,
    textAlign: 'center',
    opacity: 0.7,
  },
});

export default UpcomingEvents;