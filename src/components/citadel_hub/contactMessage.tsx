import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ContactData } from './contactPicker';
import { getAvatarColor } from './avatarColors';

interface ContactMessageProps {
  contactData: ContactData;
  isOwnMessage: boolean;
  onPress: () => void;
}

export const ContactMessage: React.FC<ContactMessageProps> = ({
  contactData,
  isOwnMessage,
  onPress,
}) => {
  const colors = getAvatarColor(contactData.name);
  const initial = contactData.name[0]?.toUpperCase() || '?';
  const phoneCount = contactData.phone_numbers?.length ?? 0;

  return (
    <TouchableOpacity
      style={[styles.card, isOwnMessage ? styles.cardOwn : styles.cardOther]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* Contact info row */}
      <View style={styles.infoRow}>
        <View style={[styles.avatar, { backgroundColor: colors.light }]}>
          <Text style={[styles.avatarText, { color: colors.dark }]}>
            {initial}
          </Text>
        </View>

        <View style={styles.textBlock}>
          <Text style={styles.name} numberOfLines={1}>
            {contactData.name}
          </Text>
          <Text style={styles.subtext}>
            {phoneCount} phone number{phoneCount !== 1 ? 's' : ''}
          </Text>
        </View>
      </View>

      {/* Divider + CTA */}
      <View style={styles.divider} />
      <View style={styles.cta}>
        <Ionicons name="person-outline" size={14} color="#00a884" />
        <Text style={styles.ctaText}>View Contact</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 8,
    overflow: 'hidden',
    minWidth: 220,
    maxWidth: 280,
    borderWidth: 1,
  },
  cardOwn: {
    backgroundColor: '#d9fdd3',
    borderColor: '#c8f0c0',
  },
  cardOther: {
    backgroundColor: '#ffffff',
    borderColor: '#e9edef',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { fontSize: 20, fontWeight: '700' },
  textBlock: { flex: 1 },
  name: { fontSize: 15, fontWeight: '600', color: '#111b21' },
  subtext: { fontSize: 12, color: '#667781', marginTop: 2 },
  divider: { height: 1, backgroundColor: '#e9edef' },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 6,
  },
  ctaText: { fontSize: 14, color: '#00a884', fontWeight: '600' },
});