// src/components/BackgroundLocationDisclosure.tsx
// Google Play Prominent Disclosure — required before requesting ACCESS_BACKGROUND_LOCATION
import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

interface Props {
  visible: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export const BackgroundLocationDisclosure: React.FC<Props> = ({
  visible,
  onAccept,
  onDecline,
}) => {
  const slideAnim = useRef(new Animated.Value(300)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 300, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onDecline}
    >
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconWrap}>
              <Ionicons name="location" size={28} color="#fff" />
            </View>
            <Text style={styles.title}>Background Location Access</Text>
            <Text style={styles.subtitle}>
              Citadel needs to access your location in the background
            </Text>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {/* What we collect */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>What we collect</Text>
              <Text style={styles.body}>
                Citadel collects your device location{' '}
                <Text style={styles.bold}>
                  even when the app is closed or not in use.
                </Text>
              </Text>
            </View>

            {/* Why */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Why we need it</Text>

              <View style={styles.reasonRow}>
                <View style={styles.bullet} />
                <View style={styles.reasonText}>
                  <Text style={styles.reasonTitle}>Automatic attendance check-in / check-out</Text>
                  <Text style={styles.reasonDesc}>
                    Detects when you enter or leave assigned work sites via geofencing — no need to open the app.
                  </Text>
                </View>
              </View>

              <View style={styles.reasonRow}>
                <View style={styles.bullet} />
                <View style={styles.reasonText}>
                  <Text style={styles.reasonTitle}>Attendance verification</Text>
                  <Text style={styles.reasonDesc}>
                    Confirms your presence at designated office or site locations when logging hours.
                  </Text>
                </View>
              </View>

              <View style={styles.reasonRow}>
                <View style={styles.bullet} />
                <View style={styles.reasonText}>
                  <Text style={styles.reasonTitle}>Periodic location checks</Text>
                  <Text style={styles.reasonDesc}>
                    Checks your location during working hours (weekdays, 8 AM – 11 AM) to support workforce management.
                  </Text>
                </View>
              </View>
            </View>

            {/* Data use note */}
            <View style={styles.noteBox}>
              <Ionicons name="shield-checkmark-outline" size={18} color="#2D7DD2" style={{ marginRight: 8, marginTop: 1 }} />
              <Text style={styles.noteText}>
                Location data is used solely for workforce attendance management and is{' '}
                <Text style={styles.bold}>not shared with third parties.</Text> You can
                disable background location at any time in your device Settings.
              </Text>
            </View>
          </ScrollView>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.acceptBtn}
              onPress={onAccept}
              activeOpacity={0.85}
            >
              <Ionicons name="checkmark-circle-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.acceptText}>I Understand, Continue</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.declineBtn}
              onPress={onDecline}
              activeOpacity={0.7}
            >
              <Text style={styles.declineText}>No Thanks — Skip Background Access</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  header: {
    backgroundColor: '#2D3748',
    paddingTop: 28,
    paddingBottom: 24,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    lineHeight: 18,
  },
  scroll: {
    flexGrow: 0,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 8,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  body: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },
  bold: {
    fontWeight: '700',
    color: '#1a1a1a',
  },
  reasonRow: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  bullet: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#2D3748',
    marginTop: 6,
    marginRight: 12,
    flexShrink: 0,
  },
  reasonText: {
    flex: 1,
  },
  reasonTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#222',
    marginBottom: 3,
  },
  reasonDesc: {
    fontSize: 13,
    color: '#555',
    lineHeight: 19,
  },
  noteBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#EBF4FF',
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
  },
  noteText: {
    flex: 1,
    fontSize: 13,
    color: '#2D5282',
    lineHeight: 19,
  },
  actions: {
    padding: 20,
    paddingTop: 12,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  acceptBtn: {
    backgroundColor: '#2D3748',
    borderRadius: 12,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  declineBtn: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  declineText: {
    color: '#888',
    fontSize: 13,
  },
});