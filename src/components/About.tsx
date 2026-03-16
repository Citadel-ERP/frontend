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
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
interface AboutProps {
  onBack?: () => void;
  isDark?: boolean;
  appVersion?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// DATA
// ─────────────────────────────────────────────────────────────────────────────
const STATS = [
  { value: '21+', label: 'Successful\nYears' },
  { value: '25M+', label: 'Sq.Ft.\nClosed' },
  { value: '2000+', label: 'Trusted\nClients' },
  { value: '55K+', label: 'Seats\nLeased' },
];

const OFFICE_LOCATIONS = [
  {
    city: 'Bangalore',
    address: '#1007, Sujaya, 2nd cross, 13th main, HAL 2nd Stage, Indiranagar, Bangalore 560008',
  },
  {
    city: 'Hyderabad',
    address: 'RMZ Spire, 7th Floor, Wework, Next to ITC Kohenur, Hitec City, Hyderabad 500081',
  },
  {
    city: 'Pune',
    address: 'Raheja Woods, 2nd floor Wework, Kalyani Nagar, Pune 411006',
  },
  {
    city: 'Chennai',
    address: 'Olympia Cyberspace, Wework, Alandur Rd, Guindy, Chennai 600032',
  },
  {
    city: 'Gurgaon',
    address: 'Two Horizon Centre, 4th floor Wework, DLF Phase 5, Golf Course Rd, Gurugram 122002',
  },
  {
    city: 'Mumbai',
    address: 'Raheja Platinum, 3rd floor B-wing Wework, Andheri East, Mumbai 400059',
  },
  {
    city: 'Noida',
    address: 'Berger Tower – Delhi One, 19th floor Wework, Sector 16B, DND Flyway, Noida 201301',
  },
  {
    city: 'Los Angeles, USA',
    address: '11766 Wilshire Boulevard, Suite 1120, Los Angeles, CA 90025, United States',
  },
];

const CONTACT_ITEMS = [
  {
    icon: 'mail-outline' as const,
    label: 'Email',
    value: 'contact@citadelnetinc.com',
    action: () => Linking.openURL('mailto:contact@citadelnetinc.com'),
  },
  {
    icon: 'call-outline' as const,
    label: 'Phone',
    value: '+91 81473 53243',
    action: () => Linking.openURL('tel:+918147353243'),
  },
  {
    icon: 'globe-outline' as const,
    label: 'Website',
    value: 'citadelnetinc.com',
    action: () => Linking.openURL('https://citadelnetinc.com'),
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function About({ onBack, isDark = false, appVersion = '1.0.0' }: AboutProps) {
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
    statBg: isDark ? '#162028' : '#F0FAF8',
    statBorder: isDark ? '#1E3040' : '#C8EDE6',
  };

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 350, useNativeDriver: true }),
    ]).start();
  }, []);

  // ── Reusable card wrapper ─────────────────────────────────────────────────
  const Card = ({ children }: { children: React.ReactNode }) => (
    <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
      {children}
    </View>
  );

  // ── Card header ───────────────────────────────────────────────────────────
  const CardHeader = ({
    icon,
    title,
  }: {
    icon: string;
    title: string;
  }) => (
    <>
      <View style={styles.cardHeader}>
        <View style={[styles.iconBox, { backgroundColor: C.iconBg }]}>
          <Ionicons name={icon as any} size={20} color={C.accent} />
        </View>
        <Text style={[styles.cardTitle, { color: C.bodyText }]}>{title}</Text>
      </View>
      <View style={[styles.divider, { backgroundColor: C.border }]} />
    </>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.root, { backgroundColor: C.bg }]}>
      <StatusBar barStyle="light-content" backgroundColor="#075E54" />

      {/* ── Header ── */}
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
            <Ionicons name="business" size={20} color="#FFFFFF" />
          </View>
          <View>
            <Text style={styles.headerTitle}>About Citadel Hub</Text>
            <Text style={styles.headerSub}>Citadel Propcon Pvt. Ltd.</Text>
          </View>
        </View>
        
      </LinearGradient>

      {/* ── Scroll body ── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

          {/* ── Hero banner ── */}
          <LinearGradient
            colors={['#075E54', '#128C7E']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroBanner}
          >
            {/* Decorative circles */}
            <View style={styles.heroCircle1} />
            <View style={styles.heroCircle2} />

            <View style={[styles.heroLogoRing, { borderColor: 'rgba(255,255,255,0.25)' }]}>
              <LinearGradient
                colors={['#25D366', '#128C7E']}
                style={styles.heroLogo}
              >
                <Ionicons name="business" size={36} color="#FFFFFF" />
              </LinearGradient>
            </View>
            <Text style={styles.heroCompany}>Citadel Propcon Pvt. Ltd.</Text>
            <Text style={styles.heroTagline}>
              Shaping workspaces. Building futures.
            </Text>
            <View style={styles.heroBadge}>
              <Ionicons name="shield-checkmark" size={12} color="#25D366" />
              <Text style={styles.heroBadgeText}>App Version {appVersion}</Text>
            </View>
          </LinearGradient>

          {/* ── Stats row ── */}
          <View style={styles.statsRow}>
            {STATS.map((stat, i) => (
              <View
                key={i}
                style={[
                  styles.statBox,
                  { backgroundColor: C.statBg, borderColor: C.statBorder },
                ]}
              >
                <Text style={[styles.statValue, { color: C.accent }]}>{stat.value}</Text>
                <Text style={[styles.statLabel, { color: C.subText }]}>{stat.label}</Text>
              </View>
            ))}
          </View>

          {/* ── About Section ── */}
          <Card>
            <CardHeader icon="information-circle-outline" title="About Us" />
            <Text style={[styles.bodyText, { color: C.subText }]}>
              Citadel Propcon Pvt. Ltd. is a leader in commercial real estate services. Defined by
              our spirit of enterprise, culture of service excellence, and a shared sense of
              initiative, we integrate the resources of real estate specialists to accelerate the
              success of our partners.
            </Text>
            <Text style={[styles.bodyText, { color: C.subText, marginTop: 10 }]}>
              Our pursuit of excellence spans over two decades — providing creative solutions that
              meet your real estate needs, ensuring smooth closures and great investment returns
              through every transaction.
            </Text>
          </Card>

          {/* ── Vision & Mission ── */}
          <Card>
            <CardHeader icon="eye-outline" title="Vision & Mission" />

            {/* Vision */}
            <View style={[styles.vmBlock, { backgroundColor: C.iconBg, borderColor: C.statBorder }]}>
              <View style={styles.vmHeader}>
                <View style={[styles.vmBadge, { backgroundColor: C.accent }]}>
                  <Text style={styles.vmBadgeText}>Vision</Text>
                </View>
              </View>
              <Text style={[styles.bodyText, { color: C.subText, marginTop: 8 }]}>
                To always place the interests of our clients above our own and strive to go the
                extra mile to exceed customer expectations, developing long-term client
                relationships. We believe in teamwork, innovation, professionalism, and endeavour
                to enhance our reputation with the highest level of integrity at all times.
              </Text>
            </View>

            {/* Mission */}
            <View
              style={[
                styles.vmBlock,
                { backgroundColor: C.iconBg, borderColor: C.statBorder, marginTop: 12 },
              ]}
            >
              <View style={styles.vmHeader}>
                <View style={[styles.vmBadge, { backgroundColor: '#25D366' }]}>
                  <Text style={styles.vmBadgeText}>Mission</Text>
                </View>
              </View>
              <Text style={[styles.bodyText, { color: C.subText, marginTop: 8 }]}>
                Citadel Propcon Pvt. Ltd. provides client-focused real estate advisory services
                through world-class intellectual capital and resources. We aim to design and
                execute customised solutions that create value for our clients, bringing together
                every square foot of workspace under one roof.
              </Text>
            </View>
          </Card>

          {/* ── Core Values ── */}
          <Card>
            <CardHeader icon="star-outline" title="Core Values" />
            {[
              {
                icon: 'people-outline',
                title: 'Customer Service',
                desc: 'We direct all efforts toward our customers — understanding, anticipating, and meeting their expectations in a timely, cost-effective, and value-added manner.',
              },
              {
                icon: 'trending-up-outline',
                title: 'Initiative & Leadership',
                desc: 'We encourage entrepreneurial behaviour, leading by example, prudent risk-taking, and fostering an atmosphere of respect and empowerment.',
              },
              {
                icon: 'chatbubbles-outline',
                title: 'Communication',
                desc: 'We seek and share all information necessary and relevant to complete our jobs effectively across every level of the organisation.',
              },
              {
                icon: 'school-outline',
                title: 'Training & Development',
                desc: 'We constantly provide training programs to develop technical, project management, interpersonal, communication, and leadership skills.',
              },
            ].map((item, idx, arr) => (
              <View
                key={idx}
                style={[
                  styles.valueRow,
                  idx < arr.length - 1 && {
                    borderBottomWidth: 1,
                    borderBottomColor: C.border,
                  },
                ]}
              >
                <View style={[styles.valueIconCircle, { backgroundColor: C.iconBg }]}>
                  <Ionicons name={item.icon as any} size={18} color={C.accent} />
                </View>
                <View style={styles.valueTextBlock}>
                  <Text style={[styles.valueTitle, { color: C.bodyText }]}>{item.title}</Text>
                  <Text style={[styles.valueDesc, { color: C.subText }]}>{item.desc}</Text>
                </View>
              </View>
            ))}
          </Card>

          {/* ── Offices ── */}
          <Card>
            <CardHeader icon="location-outline" title="Our Offices" />
            {OFFICE_LOCATIONS.map((loc, idx) => (
              <View
                key={idx}
                style={[
                  styles.officeRow,
                  idx < OFFICE_LOCATIONS.length - 1 && {
                    borderBottomWidth: 1,
                    borderBottomColor: C.border,
                  },
                ]}
              >
                <View style={[styles.officeDot, { backgroundColor: C.lightGreen }]} />
                <View style={styles.officeTextBlock}>
                  <Text style={[styles.officeCity, { color: C.bodyText }]}>{loc.city}</Text>
                  <Text style={[styles.officeAddress, { color: C.subText }]}>{loc.address}</Text>
                </View>
              </View>
            ))}
          </Card>

          {/* ── Contact ── */}
          <Card>
            <CardHeader icon="call-outline" title="Get in Touch" />
            {CONTACT_ITEMS.map((item, idx) => (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.contactRow,
                  idx < CONTACT_ITEMS.length - 1 && {
                    borderBottomWidth: 1,
                    borderBottomColor: C.border,
                  },
                ]}
                onPress={item.action}
                activeOpacity={0.7}
              >
                <View style={[styles.contactIcon, { backgroundColor: C.iconBg }]}>
                  <Ionicons name={item.icon} size={18} color={C.accent} />
                </View>
                <View style={styles.contactText}>
                  <Text style={[styles.contactLabel, { color: C.subText }]}>{item.label}</Text>
                  <Text style={[styles.contactValue, { color: C.accent }]}>{item.value}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={C.subText} />
              </TouchableOpacity>
            ))}
          </Card>

          {/* ── Footer ── */}
          <View style={styles.footer}>
            <View style={[styles.footerLogoRow]}>
              <View style={[styles.footerLogo, { backgroundColor: C.iconBg }]}>
                <Ionicons name="business" size={16} color={C.accent} />
              </View>
              <Text style={[styles.footerBrand, { color: C.bodyText }]}>Citadel Hub</Text>
            </View>
            <Text style={[styles.footerVersion, { color: C.subText }]}>
              Version {appVersion} · Internal Use Only
            </Text>
            <Text style={[styles.footerCopy, { color: C.subText }]}>
              © 2025 Citadel Propcon Pvt. Ltd. All rights reserved.
            </Text>
          </View>
        </Animated.View>
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

  // ── Scroll ────────────────────────────────────────────────────────────────
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },

  // ── Hero ──────────────────────────────────────────────────────────────────
  heroBanner: {
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: 4,
    position: 'relative',
  },
  heroCircle1: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.05)',
    top: -60,
    right: -60,
  },
  heroCircle2: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.05)',
    bottom: -40,
    left: -40,
  },
  heroLogoRing: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  heroLogo: {
    width: 76,
    height: 76,
    borderRadius: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroCompany: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.2,
    textAlign: 'center',
    marginBottom: 6,
  },
  heroTagline: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: 0.2,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.25)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  heroBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },

  // ── Stats ─────────────────────────────────────────────────────────────────
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  statBox: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.2,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 14,
  },

  // ── Card ──────────────────────────────────────────────────────────────────
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
    marginBottom: 14,
    borderRadius: 1,
  },

  // ── Body text ─────────────────────────────────────────────────────────────
  bodyText: {
    fontSize: 13.5,
    lineHeight: 21,
  },

  // ── Vision / Mission blocks ────────────────────────────────────────────────
  vmBlock: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 14,
  },
  vmHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  vmBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  vmBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // ── Core values ───────────────────────────────────────────────────────────
  valueRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    gap: 12,
  },
  valueIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  valueTextBlock: {
    flex: 1,
  },
  valueTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  valueDesc: {
    fontSize: 12.5,
    lineHeight: 19,
  },

  // ── Offices ───────────────────────────────────────────────────────────────
  officeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    gap: 12,
  },
  officeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
    flexShrink: 0,
  },
  officeTextBlock: {
    flex: 1,
  },
  officeCity: {
    fontSize: 13.5,
    fontWeight: '700',
    marginBottom: 3,
  },
  officeAddress: {
    fontSize: 12,
    lineHeight: 18,
  },

  // ── Contact ───────────────────────────────────────────────────────────────
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  contactIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  contactText: {
    flex: 1,
  },
  contactLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  contactValue: {
    fontSize: 13.5,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },

  // ── Footer ────────────────────────────────────────────────────────────────
  footer: {
    alignItems: 'center',
    paddingVertical: 16,
    gap: 6,
  },
  footerLogoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  footerLogo: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerBrand: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  footerVersion: {
    fontSize: 12,
  },
  footerCopy: {
    fontSize: 11.5,
  },
});