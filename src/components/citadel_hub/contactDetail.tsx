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
import * as IntentLauncher from 'expo-intent-launcher';
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

  const handleOpen = useCallback(() => setSaveState('idle'), []);

  // ─── Android: open native Add Contact UI ──────────────────────────────────
  const saveViaIntent = useCallback(async () => {
    if (!contactData) return;

    // Build the intent extras — Android fills the system contact form
    // with these values and lets the user pick the account themselves.
    const extras: Record<string, string> = {
      'android.intent.extra.NAME': contactData.name,
    };

    // First phone number → PHONE, rest → ignored (intent only supports one
    // phone natively; user can add more inside the contacts app)
    if (contactData.phone_numbers.length > 0) {
      extras['android.intent.extra.PHONE'] = contactData.phone_numbers[0].number;
    }
    if (contactData.emails && contactData.emails.length > 0) {
      extras['android.intent.extra.EMAIL'] = contactData.emails[0].email;
    }

    try {
      await IntentLauncher.startActivityAsync(
        'android.intent.action.INSERT',
        {
          type: 'vnd.android.cursor.dir/contact',
          extra: extras,
        }
      );
      // We can't know for sure if user saved or cancelled,
      // so optimistically mark as saved once they return.
      setSaveState('saved');
    } catch (err) {
      console.error('Intent error:', err);
      Alert.alert('Error', 'Could not open Contacts app.');
      setSaveState('idle');
    }
  }, [contactData]);

  // ─── iOS / fallback: use expo-contacts directly ───────────────────────────
  const saveViaExpoContacts = useCallback(async () => {
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

      const normaliseLabel = (raw: string): string => {
        const l = (raw || '').toLowerCase();
        if (l.includes('home')) return 'home';
        if (l.includes('work') || l.includes('office')) return 'work';
        if (l.includes('mobile') || l.includes('cell')) return 'mobile';
        if (l.includes('main')) return 'main';
        return 'other';
      };

      const nameParts = contactData.name.trim().split(/\s+/);

      const phoneNumbers: Contacts.PhoneNumber[] = contactData.phone_numbers.map(p => ({
        id: '',
        label: normaliseLabel(p.label),
        number: p.number,
        isPrimary: false,
        digits: p.number.replace(/\D/g, ''),
        countryCode: '',
      }));

      const emails: Contacts.Email[] = (contactData.emails || []).map(e => ({
        id: '',
        label: normaliseLabel(e.label),
        email: e.email,
        isPrimary: false,
      }));

      const newContact: Contacts.Contact = {
        id: '',
        contactType: Contacts.ContactTypes.Person,
        firstName: nameParts[0] || contactData.name,
        lastName: nameParts.slice(1).join(' ') || '',
        name: contactData.name,
        phoneNumbers,
        ...(emails.length > 0 ? { emails } : {}),
      };

      await Contacts.addContactAsync(newContact);
      setSaveState('saved');
    } catch (err) {
      console.error('Save contact error:', err);
      Alert.alert('Error', 'Failed to save contact. Please try again.');
      setSaveState('idle');
    }
  }, [contactData]);

  // ─── Unified save handler ─────────────────────────────────────────────────
  const handleSaveContact = useCallback(async () => {
    if (Platform.OS === 'android') {
      await saveViaIntent();
    } else {
      await saveViaExpoContacts();
    }
  }, [saveViaIntent, saveViaExpoContacts]);

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
    const isProcessing = saveState === 'checking' || saveState === 'saving';

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

// ─── Styles (unchanged) ───────────────────────────────────────────────────────
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