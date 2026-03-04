import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  StatusBar,
  Animated,
  Platform,
  Linking,
  ActivityIndicator,
  KeyboardAvoidingView,
  Alert,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BACKEND_URL } from '../config/config';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
interface SupportProps {
  onBack?: () => void;
  isDark?: boolean;
}

interface FormData {
  employeeId: string;
  fullName: string;
  issueTitle: string;
  issueDescription: string;
}

interface FormErrors {
  employeeId?: string;
  fullName?: string;
  issueTitle?: string;
  issueDescription?: string;
}

type SubmitState = 'idle' | 'loading' | 'success' | 'error';

// ─────────────────────────────────────────────────────────────────────────────
// CONTACT DETAILS
// ─────────────────────────────────────────────────────────────────────────────
const CONTACT_ITEMS = [
  {
    id: 'email',
    icon: 'mail-outline' as const,
    label: 'Email',
    value: 'prasanna@citadelnetinc.com',
    action: () => Linking.openURL('mailto:prasanna@citadelnetinc.com'),
    color: '#128C7E',
  },
  {
    id: 'phone',
    icon: 'call-outline' as const,
    label: 'Phone',
    value: '+91 98451 12669',
    action: () => Linking.openURL('tel:+919845112669'),
    color: '#25D366',
  },
  {
    id: 'address',
    icon: 'location-outline' as const,
    label: 'Office',
    value: '2nd Floor Citadel Propcon Pvt Ltd# 1007, Sujaya, 2nd cross, 13th main, HAL 2nd stage',
    action: undefined,
    color: '#075E54',
  },
  {
    id: 'hours',
    icon: 'time-outline' as const,
    label: 'Hours',
    value: 'Mon – Fri: 9:00 AM – 6:00 PM',
    action: undefined,
    color: '#128C7E',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// FLOATING LABEL INPUT COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
interface FloatingInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  isDark: boolean;
  C: Record<string, string>;
  icon: string;
  required?: boolean;
}

const FloatingInput: React.FC<FloatingInputProps> = ({
  label,
  value,
  onChangeText,
  error,
  multiline = false,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  isDark,
  C,
  icon,
  required = false,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const labelAnim = useRef(new Animated.Value(value ? 1 : 0)).current;
  const borderAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(labelAnim, {
      toValue: isFocused || value ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
    Animated.timing(borderAnim, {
      toValue: isFocused ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [isFocused, value]);

  const labelTop = labelAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [multiline ? 18 : 18, -8],
  });

  const labelSize = labelAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [14, 11],
  });

  const labelColor = labelAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [C.placeholder, isFocused ? C.accent : C.labelFloated],
  });

  const borderColor = error
    ? C.error
    : borderAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [C.border, C.accent],
      });

  return (
    <View style={{ marginBottom: error ? 6 : 16 }}>
      <Animated.View
        style={[
          styles.inputWrapper,
          {
            backgroundColor: C.inputBg,
            borderColor: borderColor as any,
            minHeight: multiline ? 110 : 56,
          },
        ]}
      >
        {/* Floating Label */}
        <Animated.Text
          style={[
            styles.floatingLabel,
            {
              top: labelTop,
              fontSize: labelSize,
              color: labelColor as any,
              backgroundColor: C.surface,
              left: 44,
            },
          ]}
        >
          {label}
          {required && <Text style={{ color: C.error }}> *</Text>}
        </Animated.Text>

        {/* Icon */}
        <View style={[styles.inputIconBox, { top: multiline ? 16 : undefined }]}>
          <Ionicons name={icon as any} size={18} color={isFocused ? C.accent : C.iconColor} />
        </View>

        {/* Input */}
        <TextInput
          style={[
            styles.textInput,
            {
              color: C.bodyText,
              paddingTop: multiline ? 24 : 0,
              textAlignVertical: multiline ? 'top' : 'center',
              height: multiline ? 100 : undefined,
              paddingLeft: 44,
            },
          ]}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          multiline={multiline}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          placeholderTextColor="transparent"
          placeholder={label}
        />
      </Animated.View>

      {/* Error text */}
      {error && (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle-outline" size={12} color={C.error} />
          <Text style={[styles.errorText, { color: C.error }]}>{error}</Text>
        </View>
      )}
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SUCCESS ANIMATION COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const SuccessView: React.FC<{ C: Record<string, string>; onReset: () => void }> = ({ C, onReset }) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const checkAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 60,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(checkAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.successContainer,
        { opacity: opacityAnim, transform: [{ scale: scaleAnim }] },
      ]}
    >
      {/* Glow ring */}
      <View style={[styles.successRing, { borderColor: C.lightGreen + '40' }]}>
        <LinearGradient
          colors={[C.teal, C.lightGreen]}
          style={styles.successCircle}
        >
          <Animated.View style={{ transform: [{ scale: checkAnim }] }}>
            <Ionicons name="checkmark" size={48} color="#FFFFFF" />
          </Animated.View>
        </LinearGradient>
      </View>

      <Text style={[styles.successTitle, { color: C.bodyText }]}>
        Ticket Submitted!
      </Text>
      <Text style={[styles.successSubtitle, { color: C.subText }]}>
        Your support request has been received. Our team will reach out within 1–2 business days.
      </Text>

      <View style={[styles.successMeta, { backgroundColor: C.surface, borderColor: C.border }]}>
        <Ionicons name="time-outline" size={16} color={C.accent} />
        <Text style={[styles.successMetaText, { color: C.subText }]}>
          Expected response: within 2 business days
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.newTicketBtn, { borderColor: C.accent }]}
        onPress={onReset}
        activeOpacity={0.7}
      >
        <Ionicons name="add-outline" size={18} color={C.accent} />
        <Text style={[styles.newTicketText, { color: C.accent }]}>Submit Another Ticket</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function Support({ onBack, isDark = false }: SupportProps) {
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  // Form state
  const [form, setForm] = useState<FormData>({
    employeeId: '',
    fullName: '',
    issueTitle: '',
    issueDescription: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitState, setSubmitState] = useState<SubmitState>('idle');

  // ── Colour palette (mirrors privacy.tsx) ─────────────────────────────────
  const C: Record<string, string> = {
    headerGreen: '#075E54',
    teal: '#128C7E',
    lightGreen: '#25D366',
    bg: isDark ? '#0F1519' : '#F5F7F9',
    surface: isDark ? '#1A2530' : '#FFFFFF',
    border: isDark ? '#2A3942' : '#E8ECF0',
    bodyText: isDark ? '#DCE8EE' : '#1A2530',
    subText: isDark ? '#7C95A4' : '#6B7F8C',
    iconBg: isDark ? '#1F3040' : '#EAF6F4',
    iconColor: isDark ? '#7C95A4' : '#9BABB6',
    accent: '#128C7E',
    inputBg: isDark ? '#1F2D38' : '#FAFBFC',
    placeholder: isDark ? '#4A6070' : '#B0BEC5',
    labelFloated: isDark ? '#7C95A4' : '#90A4AE',
    error: '#E53935',
  };

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 350, useNativeDriver: true }),
    ]).start();
  }, []);

  // ── Validation ────────────────────────────────────────────────────────────
  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    if (!form.employeeId.trim()) newErrors.employeeId = 'Employee ID is required';
    if (!form.fullName.trim()) newErrors.fullName = 'Full name is required';
    if (!form.issueTitle.trim()) newErrors.issueTitle = 'Issue title is required';
    if (!form.issueDescription.trim()) newErrors.issueDescription = 'Please describe your issue';
    else if (form.issueDescription.trim().length < 20)
      newErrors.issueDescription = 'Please provide more detail (at least 20 characters)';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!validate()) return;

    setSubmitState('loading');
    try {
      const response = await fetch(`${BACKEND_URL}/core/support`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: form.employeeId.trim(),
          full_name: form.fullName.trim(),
          issue_title: form.issueTitle.trim(),
          issue_description: form.issueDescription.trim(),
        }),
      });

      if (response.ok) {
        setSubmitState('success');
      } else {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.message || 'Server error. Please try again.');
      }
    } catch (err: any) {
      setSubmitState('error');
      Alert.alert(
        'Submission Failed',
        err?.message || 'Something went wrong. Please check your connection and try again.',
        [{ text: 'OK', onPress: () => setSubmitState('idle') }]
      );
    }
  };

  // ── Reset form ─────────────────────────────────────────────────────────────
  const handleReset = () => {
    setForm({ employeeId: '', fullName: '', issueTitle: '', issueDescription: '' });
    setErrors({});
    setSubmitState('idle');
  };

  // ── Field updater ─────────────────────────────────────────────────────────
  const updateField = (field: keyof FormData) => (text: string) => {
    setForm(prev => ({ ...prev, [field]: text }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }));
  };

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
            <Ionicons name="headset" size={20} color="#FFFFFF" />
          </View>
          <View>
            <Text style={styles.headerTitle}>Support Center</Text>
            <Text style={styles.headerSub}>Citadel ERP · We're here to help</Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          <Ionicons name="ellipsis-vertical" size={22} color="#FFFFFF" />
        </View>
      </LinearGradient>

      {/* ── Body ── */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 48 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

            {/* ── Date Banner ── */}
            <View style={[styles.dateBanner, { backgroundColor: C.surface, borderColor: C.border }]}>
              <Ionicons name="shield-checkmark-outline" size={14} color={C.subText} />
              <Text style={[styles.dateBannerText, { color: C.subText }]}>
                Avg. response time: 1–2 business days · Available Mon–Sat
              </Text>
            </View>

            {/* ── Contact Info Section ── */}
            <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
              <View style={styles.cardHeader}>
                <View style={[styles.iconBox, { backgroundColor: C.iconBg }]}>
                  <Ionicons name="call-outline" size={20} color={C.accent} />
                </View>
                <Text style={[styles.cardTitle, { color: C.bodyText }]}>Contact Information</Text>
              </View>
              <View style={[styles.divider, { backgroundColor: C.border }]} />

              {CONTACT_ITEMS.map((item, idx) => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.contactRow,
                    idx < CONTACT_ITEMS.length - 1 && { borderBottomWidth: 1, borderBottomColor: C.border },
                  ]}
                  onPress={item.action}
                  activeOpacity={item.action ? 0.7 : 1}
                  disabled={!item.action}
                >
                  <View style={[styles.contactIconCircle, { backgroundColor: item.color + '18' }]}>
                    <Ionicons name={item.icon} size={18} color={item.color} />
                  </View>
                  <View style={styles.contactTextBlock}>
                    <Text style={[styles.contactLabel, { color: C.subText }]}>{item.label}</Text>
                    <Text style={[
                      styles.contactValue,
                      { color: item.action ? C.accent : C.bodyText },
                      item.action && { textDecorationLine: 'underline' },
                    ]}>
                      {item.value}
                    </Text>
                  </View>
                  {item.action && (
                    <Ionicons name="chevron-forward" size={16} color={C.subText} />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* ── Support Form Section ── */}
            {submitState === 'success' ? (
              <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
                <SuccessView C={C} onReset={handleReset} />
              </View>
            ) : (
              <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
                <View style={styles.cardHeader}>
                  <View style={[styles.iconBox, { backgroundColor: C.iconBg }]}>
                    <Ionicons name="create-outline" size={20} color={C.accent} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardTitle, { color: C.bodyText }]}>Submit a Support Ticket</Text>
                    <Text style={[styles.cardSubtitle, { color: C.subText }]}>
                      Fill out the form and we'll get back to you shortly
                    </Text>
                  </View>
                </View>
                <View style={[styles.divider, { backgroundColor: C.border }]} />

                {/* Required note */}
                <Text style={[styles.requiredNote, { color: C.subText }]}>
                  Fields marked with <Text style={{ color: C.error }}>*</Text> are required
                </Text>

                {/* Employee ID */}
                <FloatingInput
                  label="Employee ID"
                  value={form.employeeId}
                  onChangeText={updateField('employeeId')}
                  error={errors.employeeId}
                  keyboardType="default"
                  autoCapitalize="characters"
                  isDark={isDark}
                  C={C}
                  icon="id-card-outline"
                  required
                />

                {/* Full Name */}
                <FloatingInput
                  label="Full Name"
                  value={form.fullName}
                  onChangeText={updateField('fullName')}
                  error={errors.fullName}
                  autoCapitalize="words"
                  isDark={isDark}
                  C={C}
                  icon="person-outline"
                  required
                />

                {/* Issue Title */}
                <FloatingInput
                  label="Issue Title"
                  value={form.issueTitle}
                  onChangeText={updateField('issueTitle')}
                  error={errors.issueTitle}
                  isDark={isDark}
                  C={C}
                  icon="document-text-outline"
                  required
                />

                {/* Issue Description */}
                <FloatingInput
                  label="Describe your issue in detail"
                  value={form.issueDescription}
                  onChangeText={updateField('issueDescription')}
                  error={errors.issueDescription}
                  multiline
                  isDark={isDark}
                  C={C}
                  icon="chatbox-ellipses-outline"
                  required
                />

                {/* Character count */}
                {form.issueDescription.length > 0 && (
                  <Text style={[styles.charCount, { color: C.subText }]}>
                    {form.issueDescription.length} characters
                    {form.issueDescription.length < 20 && (
                      <Text style={{ color: C.error }}> (min. 20)</Text>
                    )}
                  </Text>
                )}

                {/* Privacy note */}
                <View style={[styles.privacyNote, { backgroundColor: C.iconBg, borderColor: C.border }]}>
                  <Ionicons name="lock-closed-outline" size={14} color={C.accent} />
                  <Text style={[styles.privacyNoteText, { color: C.subText }]}>
                    Your submission is confidential and will only be accessed by authorized support staff.
                  </Text>
                </View>

                {/* Submit Button */}
                <TouchableOpacity
                  onPress={handleSubmit}
                  activeOpacity={0.85}
                  disabled={submitState === 'loading'}
                  style={styles.submitBtnOuter}
                >
                  <LinearGradient
                    colors={submitState === 'loading' ? ['#4A9E97', '#4A9E97'] : ['#075E54', '#128C7E']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.submitBtn}
                  >
                    {submitState === 'loading' ? (
                      <View style={styles.submitBtnInner}>
                        <ActivityIndicator color="#FFFFFF" size="small" />
                        <Text style={styles.submitBtnText}>Submitting...</Text>
                      </View>
                    ) : (
                      <View style={styles.submitBtnInner}>
                        <Ionicons name="send-outline" size={18} color="#FFFFFF" />
                        <Text style={styles.submitBtnText}>Submit Ticket</Text>
                      </View>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}

            {/* ── FAQ Quick Links ── */}
            {/* <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
              <View style={styles.cardHeader}>
                <View style={[styles.iconBox, { backgroundColor: C.iconBg }]}>
                  <Ionicons name="help-buoy-outline" size={20} color={C.accent} />
                </View>
                <Text style={[styles.cardTitle, { color: C.bodyText }]}>Quick Help</Text>
              </View>
              <View style={[styles.divider, { backgroundColor: C.border }]} />

              {[
                { icon: 'finger-print', label: 'Trouble with biometric login', color: '#25D366' },
                { icon: 'location-outline', label: 'Attendance not marking correctly', color: '#128C7E' },
                { icon: 'notifications-off-outline', label: 'Not receiving notifications', color: '#075E54' },
                { icon: 'key-outline', label: 'Password reset request', color: '#25D366' },
              ].map((item, idx, arr) => (
                <View
                  key={idx}
                  style={[
                    styles.faqRow,
                    idx < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: C.border },
                  ]}
                >
                  <View style={[styles.faqIconCircle, { backgroundColor: item.color + '18' }]}>
                    <Ionicons name={item.icon as any} size={16} color={item.color} />
                  </View>
                  <Text style={[styles.faqLabel, { color: C.bodyText }]}>{item.label}</Text>
                  <Ionicons name="chevron-forward" size={14} color={C.subText} />
                </View>
              ))}
            </View> */}

            {/* Footer note */}
            <Text style={[styles.footerNote, { color: C.subText }]}>
              For urgent issues, contact your manager or IT administrator directly. Response times may vary during public holidays.
            </Text>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
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

  // ── Header ─────────────────────────────────────────────────────────────
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

  // ── Scroll ──────────────────────────────────────────────────────────────
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },

  // ── Date Banner ─────────────────────────────────────────────────────────
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
    flex: 1,
  },

  // ── Card ────────────────────────────────────────────────────────────────
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    marginBottom: 4,
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
  cardSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginBottom: 16,
    borderRadius: 1,
  },

  // ── Contact rows ────────────────────────────────────────────────────────
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  contactIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  contactTextBlock: {
    flex: 1,
  },
  contactLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  contactValue: {
    fontSize: 13.5,
    lineHeight: 20,
    fontWeight: '500',
  },

  // ── Form ────────────────────────────────────────────────────────────────
  requiredNote: {
    fontSize: 12,
    marginBottom: 16,
  },
  inputWrapper: {
    borderWidth: 1.5,
    borderRadius: 12,
    position: 'relative',
    justifyContent: 'center',
  },
  floatingLabel: {
    position: 'absolute',
    paddingHorizontal: 4,
    fontWeight: '500',
    zIndex: 10,
  },
  inputIconBox: {
    position: 'absolute',
    left: 14,
    top: undefined,
    zIndex: 5,
    width: 22,
    alignItems: 'center',
  },
  textInput: {
    paddingHorizontal: 14,
    paddingVertical: 16,
    fontSize: 14,
    fontWeight: '500',
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    marginBottom: 8,
    marginLeft: 4,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '500',
  },
  charCount: {
    fontSize: 11,
    textAlign: 'right',
    marginTop: -10,
    marginBottom: 12,
    marginRight: 4,
  },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
  },
  privacyNoteText: {
    fontSize: 12,
    flex: 1,
    lineHeight: 18,
  },
  submitBtnOuter: {
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#075E54',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  submitBtn: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // ── Success ─────────────────────────────────────────────────────────────
  successContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  successRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  successCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 10,
    letterSpacing: 0.2,
  },
  successSubtitle: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    paddingHorizontal: 12,
    marginBottom: 20,
  },
  successMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 20,
    alignSelf: 'stretch',
  },
  successMetaText: {
    fontSize: 13,
    flex: 1,
  },
  newTicketBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  newTicketText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // ── FAQ ─────────────────────────────────────────────────────────────────
  faqRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  faqIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  faqLabel: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: '500',
  },

  // ── Footer ────────────────────────────────────────────────────────────
  footerNote: {
    fontSize: 11.5,
    textAlign: 'center',
    lineHeight: 17,
    paddingHorizontal: 16,
    marginTop: 4,
  },
});