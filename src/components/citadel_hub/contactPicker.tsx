import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  SectionList,
  SafeAreaView,
  Modal,
  Platform,
} from 'react-native';
import * as Contacts from 'expo-contacts';
import { Ionicons } from '@expo/vector-icons';
import { getAvatarColor } from './avatarColors';

// ─── Public Types ────────────────────────────────────────────────────────────

export interface ContactPhoneNumber {
  label: string;
  number: string;
}

export interface ContactEmailAddress {
  label: string;
  email: string;
}

export interface ContactData {
  name: string;
  phone_numbers: ContactPhoneNumber[];
  emails?: ContactEmailAddress[];
}

// ─── Component ───────────────────────────────────────────────────────────────

interface ContactPickerProps {
  visible: boolean;
  onClose: () => void;
  onSend: (contacts: ContactData[]) => void;
}

type PermissionState = 'unknown' | 'granted' | 'denied';

export const ContactPicker: React.FC<ContactPickerProps> = ({
  visible,
  onClose,
  onSend,
}) => {
  const [allContacts, setAllContacts] = useState<Contacts.Contact[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [permission, setPermission] = useState<PermissionState>('unknown');
  const [isLoading, setIsLoading] = useState(false);

  // Reset and load on open
  useEffect(() => {
    if (visible) {
      setSearchQuery('');
      setSelected(new Set());
      loadContacts();
    }
  }, [visible]);

  const loadContacts = async () => {
    setIsLoading(true);
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== 'granted') {
        setPermission('denied');
        return;
      }
      setPermission('granted');
      const { data } = await Contacts.getContactsAsync({
        fields: [
          Contacts.Fields.Name,
          Contacts.Fields.PhoneNumbers,
          Contacts.Fields.Emails,
        ],
        sort: Contacts.SortTypes.FirstName,
      });
      setAllContacts(data.filter(c => !!(c.name || c.firstName)));
    } catch {
      Alert.alert('Error', 'Failed to load contacts.');
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Filtered + Grouped ───────────────────────────────────────────────────

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return allContacts;
    return allContacts.filter(c => {
      const name = (c.name || `${c.firstName || ''} ${c.lastName || ''}`).toLowerCase();
      const hasPhone = (c.phoneNumbers || []).some(p => p.number?.includes(q));
      return name.includes(q) || hasPhone;
    });
  }, [allContacts, searchQuery]);

  const sections = useMemo(() => {
    const groups: Record<string, Contacts.Contact[]> = {};
    filtered.forEach(contact => {
      const first = (contact.name || contact.firstName || '#')[0].toUpperCase();
      const key = /[A-Z]/.test(first) ? first : '#';
      if (!groups[key]) groups[key] = [];
      groups[key].push(contact);
    });
    return Object.entries(groups)
      .sort(([a], [b]) => (a === '#' ? 1 : b === '#' ? -1 : a.localeCompare(b)))
      .map(([title, data]) => ({ title, data }));
  }, [filtered]);

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const toggleContact = useCallback((id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const handleSend = useCallback(() => {
    const picked = allContacts.filter(c => c.id && selected.has(c.id));
    const payload: ContactData[] = picked.map(c => ({
      name:
        c.name ||
        `${c.firstName || ''} ${c.lastName || ''}`.trim() ||
        'Unknown',
      phone_numbers: (c.phoneNumbers || [])
        .map(p => ({ label: p.label || 'mobile', number: p.number || '' }))
        .filter(p => p.number),
      emails: (c.emails || [])
        .map(e => ({ label: e.label || 'email', email: e.email || '' }))
        .filter(e => e.email),
    }));
    onSend(payload);
    onClose();
  }, [allContacts, selected, onSend, onClose]);

  // ─── Renderers ────────────────────────────────────────────────────────────

  const renderContact = useCallback(
    ({ item }: { item: Contacts.Contact }) => {
      const id = item.id || '';
      const isSelected = selected.has(id);
      const name =
        item.name ||
        `${item.firstName || ''} ${item.lastName || ''}`.trim() ||
        'Unknown';
      const phone = item.phoneNumbers?.[0]?.number || '';
      const colors = getAvatarColor(id);

      return (
        <TouchableOpacity
          style={[styles.row, isSelected && styles.rowSelected]}
          onPress={() => toggleContact(id)}
          activeOpacity={0.7}
        >
          <View style={[styles.avatar, { backgroundColor: colors.light }]}>
            <Text style={[styles.avatarLetter, { color: colors.dark }]}>
              {name[0]?.toUpperCase() || '?'}
            </Text>
          </View>

          <View style={styles.rowInfo}>
            <Text style={styles.rowName} numberOfLines={1}>
              {name}
            </Text>
            {!!phone && (
              <Text style={styles.rowPhone} numberOfLines={1}>
                {phone}
              </Text>
            )}
          </View>

          <View style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
            {isSelected && (
              <Ionicons name="checkmark" size={14} color="#fff" />
            )}
          </View>
        </TouchableOpacity>
      );
    },
    [selected, toggleContact]
  );

  const renderSectionHeader = useCallback(
    ({ section }: { section: { title: string } }) => (
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionHeaderText}>{section.title}</Text>
      </View>
    ),
    []
  );

  // ─── Permission Denied State ──────────────────────────────────────────────

  const PermissionDenied = () => (
    <View style={styles.centerContent}>
      <Ionicons name="person-circle-outline" size={80} color="#d1d5db" />
      <Text style={styles.centerTitle}>Contacts access denied</Text>
      <Text style={styles.centerSubtitle}>
        Enable Contacts in your device Settings to share contacts.
      </Text>
    </View>
  );

  const EmptyState = () => (
    <View style={styles.centerContent}>
      <Ionicons name="search-outline" size={64} color="#d1d5db" />
      <Text style={styles.centerTitle}>No contacts found</Text>
    </View>
  );

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={onClose}
            style={styles.headerSide}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Select Contact</Text>

          <View style={[styles.headerSide, styles.headerSideRight]}>
            {selected.size > 0 && (
              <TouchableOpacity onPress={handleSend} activeOpacity={0.7}>
                <Text style={styles.sendText}>
                  Send{selected.size > 1 ? ` (${selected.size})` : ''}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Search */}
        {permission === 'granted' && (
          <View style={styles.searchWrapper}>
            <Ionicons name="search" size={16} color="#8696a0" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search contacts..."
              placeholderTextColor="#8696a0"
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
              clearButtonMode="while-editing"
              autoCorrect={false}
            />
          </View>
        )}

        {/* Body */}
        {isLoading ? (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color="#00a884" />
            <Text style={styles.loadingText}>Loading contacts…</Text>
          </View>
        ) : permission === 'denied' ? (
          <PermissionDenied />
        ) : sections.length === 0 ? (
          <EmptyState />
        ) : (
          <SectionList
            sections={sections}
            keyExtractor={item => item.id || Math.random().toString(36)}
            renderItem={renderContact}
            renderSectionHeader={renderSectionHeader}
            stickySectionHeadersEnabled
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
          />
        )}
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e9edef',
  },
  headerSide: { minWidth: 70 },
  headerSideRight: { alignItems: 'flex-end' },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '600',
    color: '#111b21',
  },
  cancelText: { fontSize: 16, color: '#8696a0' },
  sendText: { fontSize: 16, color: '#00a884', fontWeight: '600' },

  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f2f5',
    borderRadius: 8,
    marginHorizontal: 16,
    marginVertical: 8,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'android' ? 6 : 8,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 15, color: '#111b21', padding: 0 },

  listContent: { paddingBottom: 24 },

  sectionHeader: {
    backgroundColor: '#f0f2f5',
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  sectionHeaderText: { fontSize: 13, fontWeight: '600', color: '#667781' },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    gap: 12,
  },
  rowSelected: { backgroundColor: '#f0fff8' },

  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLetter: { fontSize: 18, fontWeight: '600' },

  rowInfo: { flex: 1 },
  rowName: { fontSize: 16, color: '#111b21', fontWeight: '500' },
  rowPhone: { fontSize: 13, color: '#667781', marginTop: 2 },

  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#d1d5db',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: { backgroundColor: '#00a884', borderColor: '#00a884' },

  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 12,
  },
  centerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111b21',
    textAlign: 'center',
  },
  centerSubtitle: {
    fontSize: 14,
    color: '#667781',
    textAlign: 'center',
    lineHeight: 20,
  },
  loadingText: { fontSize: 14, color: '#667781', marginTop: 8 },
});