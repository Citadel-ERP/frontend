import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Animated,
  Platform,
  Linking,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
interface PrivacyPolicyProps {
  onBack?: () => void;
  isDark?: boolean;
}

interface Section {
  id: string;
  icon: string;
  iconFamily: 'Ionicons' | 'MaterialCommunityIcons' | 'FontAwesome5';
  title: string;
  content: string | string[];
  bullets?: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// DATA
// ─────────────────────────────────────────────────────────────────────────────
const SECTIONS: Section[] = [
  {
    id: 'intro',
    icon: 'document-text-outline',
    iconFamily: 'Ionicons',
    title: 'Overview',
    content:
      'This Privacy Policy explains how we collect, use, and protect your information when you use our mobile application. We are committed to safeguarding your privacy.',
  },
  {
    id: 'collect',
    icon: 'information-circle-outline',
    iconFamily: 'Ionicons',
    title: 'Information We Collect',
    content:
      'We only collect information that is necessary to provide and improve the functionality of the app. No unnecessary data is ever collected.',
  },
  {
    id: 'camera',
    icon: 'camera-outline',
    iconFamily: 'Ionicons',
    title: 'Camera Usage',
    content:
      'The app uses the device camera exclusively for Face ID authentication and related security features. Camera access is used only when required and never without your consent.',
    bullets: [
      'Camera is accessed only for Face ID / security authentication',
      'We do not store, transmit, or share camera images or videos',
      'No background camera access is ever initiated',
    ],
  },
  {
    id: 'biometric',
    icon: 'finger-print',
    iconFamily: 'Ionicons',
    title: 'Biometric & Face ID Data',
    content:
      'The app uses biometric authentication methods such as fingerprint and Face ID to securely authenticate users and protect sensitive data.',
    bullets: [
      'Biometric data is processed locally on your device',
      'No biometric data is stored on our servers',
      'No biometric data is shared with third parties',
    ],
  },
  {
    id: 'location',
    icon: 'location-outline',
    iconFamily: 'Ionicons',
    title: 'Location Information',
    content:
      'The app collects location data to support attendance-related features. We do not track users unnecessarily or use location data for advertising.',
    bullets: [
      'Location access is used to verify your presence at the office',
      'Background location may be used to automatically mark attendance',
      'Location data is only used for attendance purposes',
    ],
  },
  {
    id: 'background',
    icon: 'sync-outline',
    iconFamily: 'Ionicons',
    title: 'Background Services',
    content: 'The app may use foreground and background services to:',
    bullets: [
      'Fetch updates',
      'Process attendance-related location checks',
      'Deliver important notifications',
    ],
  },
  {
    id: 'notifications',
    icon: 'notifications-outline',
    iconFamily: 'Ionicons',
    title: 'Notifications & Vibration',
    content:
      'We use notifications to inform users about important updates, attendance status, and app-related alerts. Vibration may be used to enhance notification experience.',
  },
  {
    id: 'wakelock',
    icon: 'lock-closed-outline',
    iconFamily: 'Ionicons',
    title: 'Wake Lock',
    content:
      'Wake lock permission is used to ensure critical tasks such as attendance verification and background processing complete without interruption.',
  },
  {
    id: 'sharing',
    icon: 'share-social-outline',
    iconFamily: 'Ionicons',
    title: 'Data Sharing',
    content:
      'We do not sell, rent, or trade your personal data. Information is not shared with third parties unless required by law.',
  },
  {
    id: 'security',
    icon: 'shield-checkmark-outline',
    iconFamily: 'Ionicons',
    title: 'Data Security',
    content:
      'We implement appropriate technical and organizational measures to protect your data against unauthorized access, loss, or misuse.',
  },
  {
    id: 'control',
    icon: 'settings-outline',
    iconFamily: 'Ionicons',
    title: 'User Control',
    content:
      'You can revoke permissions such as camera, location, and notifications at any time through your device settings.',
  },
  {
    id: 'changes',
    icon: 'refresh-outline',
    iconFamily: 'Ionicons',
    title: 'Changes to This Policy',
    content:
      'We may update this Privacy Policy from time to time. Any changes will be reflected on this page with an updated effective date.',
  },
  {
    id: 'contact',
    icon: 'mail-outline',
    iconFamily: 'Ionicons',
    title: 'Contact Us',
    content: 'If you have any questions or concerns about this Privacy Policy, please contact us at:',
    bullets: ['info@citadel.com'],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// ICON RENDERER
// ─────────────────────────────────────────────────────────────────────────────
const SectionIcon = ({
  name,
  family,
  size,
  color,
}: {
  name: string;
  family: 'Ionicons' | 'MaterialCommunityIcons' | 'FontAwesome5';
  size: number;
  color: string;
}) => {
  if (family === 'MaterialCommunityIcons')
    return <MaterialCommunityIcons name={name as any} size={size} color={color} />;
  if (family === 'FontAwesome5')
    return <FontAwesome5 name={name as any} size={size} color={color} />;
  return <Ionicons name={name as any} size={size} color={color} />;
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function PrivacyPolicy({ onBack, isDark = false }: PrivacyPolicyProps) {
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  // ── Colour palette ────────────────────────────────────────────────────────
  const C = {
    headerGreen: '#075E54' as const,
    teal: '#128C7E' as const,
    lightGreen: '#25D366' as const,
    bg: isDark ? '#0F1519' : '#F5F7F9',
    surface: isDark ? '#1A2530' : '#FFFFFF',
    border: isDark ? '#2A3942' : '#E8ECF0',
    bodyText: isDark ? '#DCE8EE' : '#1A2530',
    subText: isDark ? '#7C95A4' : '#6B7F8C',
    iconBg: isDark ? '#1F3040' : '#EAF6F4',
    accent: '#128C7E' as const,
  };

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER SECTION CARD
  // ─────────────────────────────────────────────────────────────────────────
  const renderSection = (section: Section, index: number) => {
    return (
      <Animated.View
        key={section.id}
        style={[
          styles.card,
          {
            backgroundColor: C.surface,
            borderColor: C.border,
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {/* Card header row */}
        <View style={styles.cardHeader}>
          <View style={[styles.iconBox, { backgroundColor: C.iconBg }]}>
            <SectionIcon
              name={section.icon}
              family={section.iconFamily}
              size={20}
              color={C.accent}
            />
          </View>
          <Text style={[styles.cardTitle, { color: C.bodyText }]}>{section.title}</Text>
        </View>

        {/* Divider */}
        <View style={[styles.divider, { backgroundColor: C.border }]} />

        {/* Body text */}
        <Text style={[styles.cardBody, { color: C.subText }]}>{section.content}</Text>

        {/* Bullet list */}
        {section.bullets && section.bullets.length > 0 && (
          <View style={styles.bulletList}>
            {section.bullets.map((bullet, bi) => (
              <View key={bi} style={styles.bulletRow}>
                <View style={[styles.bulletDot, { backgroundColor: C.lightGreen }]} />
                {section.id === 'contact' && bullet.includes('@') ? (
                  <Text
                    style={[styles.bulletText, { color: C.accent, textDecorationLine: 'underline' }]}
                    onPress={() => Linking.openURL(`mailto:${bullet}`)}
                  >
                    {bullet}
                  </Text>
                ) : (
                  <Text style={[styles.bulletText, { color: C.subText }]}>{bullet}</Text>
                )}
              </View>
            ))}
          </View>
        )}
      </Animated.View>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.root, { backgroundColor: C.bg }]}>
      <StatusBar barStyle="light-content" backgroundColor="#075E54" />

      {/* ── Header (unchanged) ── */}
      <LinearGradient
        colors={['#075E54', '#128C7E']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.header, { paddingTop: insets.top + (Platform.OS === 'ios' ? 0 : 8) }]}
      >
        {onBack && (
          <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        )}
        <View style={styles.headerCenter}>
          <View style={[styles.headerAvatar, { backgroundColor: '#25D366' }]}>
            <Ionicons name="shield-checkmark" size={20} color="#FFFFFF" />
          </View>
          <View>
            <Text style={styles.headerTitle}>Privacy Policy</Text>
            <Text style={styles.headerSub}>Citadel ERP · Secure &amp; Transparent</Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          <Ionicons name="ellipsis-vertical" size={22} color="#FFFFFF" />
        </View>
      </LinearGradient>

      {/* ── Scroll body ── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 32 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Effective date banner */}
        <View style={[styles.dateBanner, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Ionicons name="calendar-outline" size={14} color={C.subText} />
          <Text style={[styles.dateBannerText, { color: C.subText }]}>
            Effective date: January 2025
          </Text>
        </View>

        {SECTIONS.map((section, index) => renderSection(section, index))}

        {/* Footer note */}
        <Text style={[styles.footerNote, { color: C.subText }]}>
          This policy may be updated periodically. Please review it regularly to stay informed.
        </Text>
      </ScrollView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
  },

  // ── Header ──────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingBottom: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  backBtn: {
    padding: 8,
    marginRight: 4,
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  headerSub: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 11,
    marginTop: 1,
  },
  headerActions: {
    padding: 8,
  },

  // ── Scroll ───────────────────────────────────────────────────────────────
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },

  // ── Date banner ───────────────────────────────────────────────────────────
  dateBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 4,
  },
  dateBannerText: {
    fontSize: 12,
    fontWeight: '500',
  },

  // ── Card ─────────────────────────────────────────────────────────────────
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
    letterSpacing: 0.1,
  },
  divider: {
    height: 1,
    marginBottom: 12,
    borderRadius: 1,
  },

  // ── Body ─────────────────────────────────────────────────────────────────
  cardBody: {
    fontSize: 13.5,
    lineHeight: 21,
  },

  // ── Bullets ───────────────────────────────────────────────────────────────
  bulletList: {
    marginTop: 10,
    gap: 8,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 7,
    flexShrink: 0,
  },
  bulletText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
  },

  // ── Footer ────────────────────────────────────────────────────────────────
  footerNote: {
    fontSize: 11.5,
    textAlign: 'center',
    lineHeight: 17,
    paddingHorizontal: 16,
    marginTop: 8,
  },
});