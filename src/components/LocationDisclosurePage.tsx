// src/components/LocationDisclosurePage.tsx
//
// ─── Google Play Prominent Disclosure — FULL-SCREEN PAGE ───────────────────
//
// Shown ONLY on first install (never again after that).
// AsyncStorage key: 'bg_location_disclosure_shown_v1'
//
// Flow:
//   First install  → Splash → DisclosurePage → Login (or MPIN)
//   Subsequent run → Splash → Login (or MPIN) directly
//
import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
  Dimensions,
  Platform,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// ── Import your shared color tokens (adjust path as needed) ──────────────────
import { colors } from '../styles/theme';

const { width, height } = Dimensions.get('window');

interface Props {
  /** Called when the user taps "I Understand, Continue" */
  onAccept: () => void;
}

// ─── Reason row helper ────────────────────────────────────────────────────────
const ReasonRow: React.FC<{
  icon: string;
  title: string;
  desc: string;
  delay: number;
  fadeAnim: Animated.Value;
}> = ({ icon, title, desc, delay, fadeAnim }) => {
  const rowAnim  = useRef(new Animated.Value(0)).current;
  const rowSlide = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(rowAnim,  { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(rowSlide, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]).start();
    }, delay);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View
      style={[styles.reasonRow, { opacity: rowAnim, transform: [{ translateY: rowSlide }] }]}
    >
      <View style={styles.reasonIconBox}>
        <Ionicons name={icon as any} size={20} color={colors.primary} />
      </View>
      <View style={styles.reasonText}>
        <Text style={styles.reasonTitle}>{title}</Text>
        <Text style={styles.reasonDesc}>{desc}</Text>
      </View>
    </Animated.View>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────
const LocationDisclosurePage: React.FC<Props> = ({ onAccept }) => {
  const headerFade  = useRef(new Animated.Value(0)).current;
  const headerSlide = useRef(new Animated.Value(-30)).current;
  const contentFade = useRef(new Animated.Value(0)).current;
  const btnScale    = useRef(new Animated.Value(0.9)).current;
  const btnOpacity  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(headerFade,  { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(headerSlide, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]),
      Animated.timing(contentFade, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.parallel([
        Animated.spring(btnScale,   { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
        Animated.timing(btnOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(btnScale, { toValue: 0.96, duration: 80, useNativeDriver: true }),
      Animated.timing(btnScale, { toValue: 1,    duration: 80, useNativeDriver: true }),
    ]).start(() => onAccept());
  };

  return (
    <View style={styles.root}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={colors.background}
        translucent={false}
      />
      <SafeAreaView style={styles.safe}>
        {/* ── Decorative background shapes ────────────────────────────── */}
        <View style={styles.bgCircle1} />
        <View style={styles.bgCircle2} />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* ── Header ─────────────────────────────────────────────────── */}
          <Animated.View
            style={[
              styles.header,
              { opacity: headerFade, transform: [{ translateY: headerSlide }] },
            ]}
          >
            <View style={styles.iconRing}>
              <View style={styles.iconInner}>
                <Ionicons name="location-sharp" size={36} color={colors.white} />
              </View>
            </View>
            <Text style={styles.appTag}>CITADEL ERP</Text>
            <Text style={styles.title}>Location Access{'\n'}Required</Text>
            <Text style={styles.subtitle}>
              Before you sign in, please review how Citadel uses your device location.
            </Text>
          </Animated.View>

          {/* ── Content card ────────────────────────────────────────────── */}
          <Animated.View style={[styles.card, { opacity: contentFade }]}>

            {/* What we access */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionDot} />
                <Text style={styles.sectionTitle}>WHAT WE ACCESS</Text>
              </View>
              <View style={styles.highlightBox}>
                <Ionicons
                  name="warning-outline"
                  size={16}
                  color="#D97706"
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.highlightText}>
                  Citadel accesses your device location{' '}
                  <Text style={styles.highlightBold}>
                    even when the app is closed or not in use
                  </Text>
                  {' '}(Background Location).
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Why we need it */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionDot} />
                <Text style={styles.sectionTitle}>WHY WE NEED IT</Text>
              </View>
              <ReasonRow
                icon="checkmark-circle-outline"
                title="Automatic Attendance Check-In"
                desc="Detects when you arrive at your assigned work site using geofencing, so attendance is marked without opening the app."
                delay={200}
                fadeAnim={contentFade}
              />
              <ReasonRow
                icon="shield-checkmark-outline"
                title="Attendance Verification"
                desc="Confirms your presence at designated office or site locations when logging work hours."
                delay={350}
                fadeAnim={contentFade}
              />
              <ReasonRow
                icon="time-outline"
                title="Periodic Location Checks"
                desc="Monitors your location during working hours (Mon–Fri, 8 AM–11 AM) to support workforce management."
                delay={500}
                fadeAnim={contentFade}
              />
            </View>

            <View style={styles.divider} />

            {/* Data use note */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionDot} />
                <Text style={styles.sectionTitle}>DATA USAGE</Text>
              </View>
              <View style={styles.noteBox}>
                <Ionicons
                  name="lock-closed-outline"
                  size={16}
                  color={colors.primary}
                  style={{ marginRight: 10, marginTop: 1 }}
                />
                <Text style={styles.noteText}>
                  Your location data is used{' '}
                  <Text style={styles.noteBold}>exclusively</Text> for workforce
                  attendance management. It is{' '}
                  <Text style={styles.noteBold}>never sold or shared with third parties.</Text>
                  {'\n\n'}
                  You can revoke this permission at any time via:{'\n'}
                  <Text style={styles.notePath}>
                    Settings → Apps → Citadel → Permissions → Location
                  </Text>
                </Text>
              </View>
            </View>

          </Animated.View>

          {/* Spacer for button clearance */}
          <View style={{ height: 100 }} />
        </ScrollView>

        {/* ── Sticky bottom CTA ───────────────────────────────────────── */}
        <Animated.View
          style={[
            styles.stickyBottom,
            { opacity: btnOpacity, transform: [{ scale: btnScale }] },
          ]}
        >
          <TouchableOpacity
            style={styles.acceptBtn}
            onPress={handlePress}
            activeOpacity={0.9}
            accessibilityRole="button"
            accessibilityLabel="I understand the background location usage. Continue to sign in."
          >
            <Ionicons
              name="checkmark-circle"
              size={22}
              color={colors.white}
              style={{ marginRight: 10 }}
            />
            <Text style={styles.acceptBtnText}>I Understand, Continue</Text>
          </TouchableOpacity>
          <Text style={styles.footnote}>
            By continuing you acknowledge the location access described above.
          </Text>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  safe: {
    flex: 1,
  },

  // ── Decorative blobs (subtle primary tints)
  bgCircle1: {
    position: 'absolute',
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: width * 0.4,
    // ~4 % primary tint — keeps the light feel without hardcoding a colour
    backgroundColor: `${colors.primary}0A`,
    top: -width * 0.2,
    right: -width * 0.2,
  },
  bgCircle2: {
    position: 'absolute',
    width: width * 0.6,
    height: width * 0.6,
    borderRadius: width * 0.3,
    backgroundColor: `${colors.primary}07`,
    bottom: height * 0.15,
    left: -width * 0.15,
  },

  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 24 : 20,
    paddingBottom: 20,
  },

  // ── Header
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  iconRing: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: `${colors.primary}15`,  // 8 % opacity
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: `${colors.primary}30`,       // 19 % opacity
  },
  iconInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  appTag: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 2.5,
    marginBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    lineHeight: 36,
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: '400',
    paddingHorizontal: 8,
  },

  // ── Card
  card: {
    backgroundColor: colors.white,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
    }),
  },

  // ── Sections
  section: { padding: 20 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionDot: {
    width: 4,
    height: 16,
    borderRadius: 2,
    backgroundColor: colors.primary,
    marginRight: 10,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4A5568',
    letterSpacing: 1.5,
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
  },

  // ── Warning highlight box
  highlightBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(217,119,6,0.07)',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(217,119,6,0.20)',
  },
  highlightText: {
    flex: 1,
    fontSize: 14,
    color: '#92400E',
    lineHeight: 21,
  },
  highlightBold: {
    fontWeight: '700',
    color: '#B45309',
  },

  // ── Reason rows
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  reasonIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: `${colors.primary}12`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    flexShrink: 0,
    marginTop: 1,
    borderWidth: 1,
    borderColor: `${colors.primary}22`,
  },
  reasonText: { flex: 1 },
  reasonTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  reasonDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
  },

  // ── Note (data-usage) box
  noteBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: `${colors.primary}0A`,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: `${colors.primary}22`,
  },
  noteText: {
    flex: 1,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  noteBold: {
    fontWeight: '700',
    color: colors.text,
  },
  notePath: {
    fontStyle: 'italic',
    color: '#4A5568',
    fontSize: 12,
  },

  // ── Sticky bottom CTA
  stickyBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  acceptBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: { elevation: 4 },
    }),
  },
  acceptBtnText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  footnote: {
    textAlign: 'center',
    fontSize: 11,
    color: '#4A5568',
    marginTop: 10,
    lineHeight: 16,
  },
});

export default LocationDisclosurePage;