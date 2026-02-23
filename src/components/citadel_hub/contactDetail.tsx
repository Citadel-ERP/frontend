import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Linking,
  Platform,
  Modal,
  SafeAreaView,
} from 'react-native';
import * as Contacts from 'expo-contacts';
import { Ionicons } from '@expo/vector-icons';
import { ContactData } from './contactPicker';
import { getAvatarColor } from './avatarColors';

// ─── Types ────────────────────────────────────────────────────────────────────

type SaveState = 'idle' | 'checking' | 'saving' | 'saved' | 'already_exists';

interface ContactDetailProps {
  visible: boolean;
  contactData: ContactData | null;
  onClose: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const ContactDetail: React.FC<ContactDetailProps> = ({
  visible,
  contactData,
  onClose,
}) => {
  const [saveState, setSaveState] = useState<SaveState>('idle');

  // Reset save state when contact changes
  const handleOpen = useCallback(() => setSaveState('idle'), []);

  const handleSaveContact = useCallback(async () => {
    if (!contactData) return;

    setSaveState('checking');

    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Enable Contacts in Settings to save this contact.'
        );
        setSaveState('idle');
        return;
      }

      // Check for duplicates by name
      const { data: existing } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.Name],
      });
      const duplicate = existing.some(c => {
        const n = (c.name || `${c.firstName || ''} ${c.lastName || ''}`).trim();
        return n.toLowerCase() === contactData.name.toLowerCase();
      });

      if (duplicate) {
        setSaveState('already_exists');
        return;
      }

      setSaveState('saving');

      const nameParts = contactData.name.split(' ');
      const newContact: Contacts.Contact = {
        contactType: Contacts.ContactTypes.Person,
        firstName: nameParts[0] || contactData.name,
        lastName: nameParts.slice(1).join(' ') || undefined,
        name: contactData.name,
        phoneNumbers: contactData.phone_numbers.map(p => ({
          label: p.label,
          number: p.number,
        })),
        emails: (contactData.emails || []).map(e => ({
          label: e.label,
          email: e.email,
        })),
      };

      await Contacts.addContactAsync(newContact);
      setSaveState('saved');
    } catch (err) {
      console.error('Save contact error:', err);
      Alert.alert('Error', 'Failed to save contact. Please try again.');
      setSaveState('idle');
    }
  }, [contactData]);

  const handleCallNumber = useCallback((number: string) => {
    const url = `tel:${number.replace(/\s/g, '')}`;
    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        Linking.openURL(url);
      } else {
        Alert.alert('Cannot Call', 'This device cannot make phone calls.');
      }
    });
  }, []);

  // ─── Sub-components ────────────────────────────────────────────────────────

  const SaveButton = useCallback(() => {
    const isProcessing =
      saveState === 'checking' || saveState === 'saving';

    if (saveState === 'saved') {
      return (
        <View style={[styles.saveBtn, styles.saveBtnMuted]}>
          <Ionicons name="checkmark-circle" size={18} color="#00a884" />
          <Text style={[styles.saveBtnText, { color: '#00a884' }]}>
            Contact Saved
          </Text>
        </View>
      );
    }

    if (saveState === 'already_exists') {
      return (
        <View style={[styles.saveBtn, styles.saveBtnMuted]}>
          <Ionicons name="checkmark-circle" size={18} color="#667781" />
          <Text style={[styles.saveBtnText, { color: '#667781' }]}>
            Already in Contacts
          </Text>
        </View>
      );
    }

    if (isProcessing) {
      return (
        <View style={styles.saveBtn}>
          <ActivityIndicator size="small" color="#ffffff" />
          <Text style={styles.saveBtnText}>
            {saveState === 'checking' ? 'Checking…' : 'Saving…'}
          </Text>
        </View>
      );
    }

    return (
      <TouchableOpacity
        style={styles.saveBtn}
        onPress={handleSaveContact}
        activeOpacity={0.8}
      >
        <Ionicons name="person-add-outline" size={18} color="#ffffff" />
        <Text style={styles.saveBtnText}>Save to Contacts</Text>
      </TouchableOpacity>
    );
  }, [saveState, handleSaveContact]);

  // ─── Guard ────────────────────────────────────────────────────────────────

  if (!contactData) return null;

  const colors = getAvatarColor(contactData.name);
  const initial = contactData.name[0]?.toUpperCase() || '?';

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
      onShow={handleOpen}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeBtn}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={24} color="#111b21" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Contact Info</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Avatar */}
          <View style={styles.heroSection}>
            <View style={[styles.heroAvatar, { backgroundColor: colors.light }]}>
              <Text style={[styles.heroAvatarText, { color: colors.dark }]}>
                {initial}
              </Text>
            </View>
            <Text style={styles.heroName}>{contactData.name}</Text>
          </View>

          {/* Save Button */}
          <View style={styles.saveBtnContainer}>
            <SaveButton />
          </View>

          {/* Phone Numbers */}
          {contactData.phone_numbers.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>PHONE</Text>
              {contactData.phone_numbers.map((phone, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.infoRow}
                  onPress={() => handleCallNumber(phone.number)}
                  activeOpacity={0.7}
                >
                  <View style={styles.infoIcon}>
                    <Ionicons name="call-outline" size={20} color="#00a884" />
                  </View>
                  <View style={styles.infoText}>
                    <Text style={styles.infoValue}>{phone.number}</Text>
                    <Text style={styles.infoMeta}>{phone.label}</Text>
                  </View>
                  <Ionicons name="call" size={18} color="#00a884" />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Emails */}
          {!!contactData.emails && contactData.emails.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>EMAIL</Text>
              {contactData.emails.map((em, idx) => (
                <View key={idx} style={styles.infoRow}>
                  <View style={styles.infoIcon}>
                    <Ionicons name="mail-outline" size={20} color="#667781" />
                  </View>
                  <View style={styles.infoText}>
                    <Text style={styles.infoValue}>{em.email}</Text>
                    <Text style={styles.infoMeta}>{em.label}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e9edef',
  },
  closeBtn: { padding: 8, width: 40 },
  headerTitle: { fontSize: 17, fontWeight: '600', color: '#111b21' },

  scrollContent: { paddingBottom: 48 },

  heroSection: {
    alignItems: 'center',
    paddingTop: 36,
    paddingBottom: 24,
  },
  heroAvatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  heroAvatarText: { fontSize: 40, fontWeight: '700' },
  heroName: { fontSize: 24, fontWeight: '700', color: '#111b21' },

  saveBtnContainer: { paddingHorizontal: 24, marginBottom: 4 },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00a884',
    borderRadius: 24,
    paddingVertical: 12,
    gap: 8,
  },
  saveBtnMuted: { backgroundColor: '#f0f2f5' },
  saveBtnText: { fontSize: 16, fontWeight: '600', color: '#ffffff' },

  section: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f2f5',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8696a0',
    letterSpacing: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 16,
  },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f0f2f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoText: { flex: 1 },
  infoValue: { fontSize: 16, color: '#111b21' },
  infoMeta: {
    fontSize: 12,
    color: '#8696a0',
    marginTop: 2,
    textTransform: 'capitalize',
  },
});