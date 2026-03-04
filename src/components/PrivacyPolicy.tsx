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
  subsections?: { title: string; bullets: string[] }[];
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
      'This Privacy Policy governs how Citadel Net Inc. ("Company", "we", "us", or "our") collects, processes, stores, shares, and protects the personal information of authorized employees who access and use the internal Employee Management Application ("Application"). By using the Application, you acknowledge that you have read and understood this Policy.\n\nThis Application is a closed, enterprise-only system. There is no public access, no self-registration, and no use of data for commercial purposes such as advertising.',
  },
  {
    id: 'scope',
    icon: 'people-outline',
    iconFamily: 'Ionicons',
    title: 'Scope & Applicability',
    content: 'This Policy applies to all individuals granted access to the Application, including:',
    bullets: [
      'Full-time and part-time employees of the Company',
      'Contractual staff with system access granted by authorized HR or Admin personnel',
      'Site managers, team leads, and administrative staff',
      'Any other personnel whose accounts are explicitly provisioned within the system',
    ],
  },
  {
    id: 'collect',
    icon: 'information-circle-outline',
    iconFamily: 'Ionicons',
    title: 'Information We Collect',
    content: 'We collect only the minimum information necessary to operate the Application and manage workforce functions.\n\nAccount & Employment Information:',
    bullets: [
      'Full Name – for identification, communication, and record-keeping',
      'Official Email Address – primary login credential and system notifications',
      'Employee ID – unique identifier linking all activity to the correct record',
      'Company ID – assigns the employee to their correct entity or branch',
      'Office Location Mapping – associates employee with their designated site for geofencing',
      'Role and Access Permissions – determines authorized modules, data views, and actions',
    ],
    subsections: [
      {
        title: 'Attendance Information:',
        bullets: [
          'Check-in and Check-out Timestamps',
          'Location Coordinates at time of attendance marking',
          'Geofence Validation Status (within / outside boundary)',
          'Attendance Status (Present, Absent, Late, etc.)',
          'Automatic vs. Manual mark indicator',
        ],
      },
      {
        title: 'Messaging & Internal Communication:',
        bullets: [
          'Messages sent within the Application between employees',
          'Images and attachments uploaded in messages or module comments',
          'Module activity logs (HR, Lead Tracking, Site, Driver, Cab)',
          'Sender and recipient identifiers for audit purposes',
        ],
      },
      {
        title: 'Device & Technical Information:',
        bullets: [
          'Device type and model',
          'Operating system version',
          'Application version',
          'Error and diagnostic log files',
          'Session identifiers (expire on logout)',
        ],
      },
    ],
  },
  {
    id: 'location',
    icon: 'location-outline',
    iconFamily: 'Ionicons',
    title: 'Location Data Usage',
    content:
      'Location data is collected strictly for attendance validation and geofencing. We access location only during defined attendance windows — never continuously throughout the workday.',
    bullets: [
      'Precise (Fine) Location – high-accuracy GPS required for geofence validation',
      'Background Location – enables automatic attendance during scheduled login windows even when the App is not in the foreground',
      'Location is NOT accessed continuously or outside attendance windows',
      'No live tracking or movement monitoring is performed',
      'If within geofence: only attendance status is stored; coordinates are not retained',
      'If outside geofence: coordinates may be stored for audit purposes and retained for 2 years',
    ],
  },
  {
    id: 'biometric',
    icon: 'finger-print',
    iconFamily: 'Ionicons',
    title: 'Biometric Authentication',
    content:
      'The Application uses device-native biometric APIs (Face ID on iOS, Fingerprint on Android) to securely authenticate users. Authentication happens entirely on-device.',
    bullets: [
      'Biometric data is stored exclusively on your device in hardware-secured storage (Secure Enclave / TEE)',
      'The App receives only a binary success/failure result from the OS',
      'No biometric data is ever transmitted to our servers',
      'No biometric data is collected, stored, or processed by us',
      'We do not use any third-party facial recognition system or biometric SDK',
      'Biometric login is optional — email + password is always available as fallback',
    ],
  },
  {
    id: 'camera',
    icon: 'camera-outline',
    iconFamily: 'Ionicons',
    title: 'Camera Usage',
    content:
      'Camera access is used exclusively for uploading images within the internal messaging system and operational modules (e.g., site documentation, incident reporting, vehicle status).',
    bullets: [
      'Camera is NOT used for attendance verification or facial recognition',
      'No "selfie check-in" or photo-based attendance feature exists',
      'Uploaded images are stored in Amazon S3 with access-controlled policies',
      'Only authorized users can view images relevant to their work context',
      'Images are retained for up to 7 years per Company record-keeping policy',
    ],
  },
  {
    id: 'background',
    icon: 'sync-outline',
    iconFamily: 'Ionicons',
    title: 'Background Services & Permissions',
    content: 'The Application requests the following device permissions to function correctly:',
    bullets: [
      'Foreground Service – processes attendance validation during login windows reliably',
      'Post Notifications – sends attendance reminders, module updates, and message alerts',
      'Vibration – haptic feedback for notifications (optional)',
      'Internet Access – required for all server communication',
      'Network State – checks connectivity before data sync to prevent failed requests',
      'Ignore Battery Optimizations – prevents Android OS from suspending geofencing during battery-save mode',
      'Wake Lock – temporarily prevents CPU sleep during critical tasks; released immediately after completion',
    ],
  },
  {
    id: 'data_usage',
    icon: 'analytics-outline',
    iconFamily: 'Ionicons',
    title: 'How We Use Your Data',
    content: 'All collected data is used exclusively for the following organizational purposes:',
    subsections: [
      {
        title: 'Workforce Management:',
        bullets: [
          'Recording and managing attendance, punctuality, and leave records',
          'Calculating attendance-based payroll components where applicable',
          'Providing HR with accurate, real-time workforce presence data',
        ],
      },
      {
        title: 'Operational Coordination:',
        bullets: [
          'Facilitating internal communication between employees, leads, HR, and management',
          'Managing modules including site activity, driver assignments, lead tracking, and cab coordination',
        ],
      },
      {
        title: 'Security & Compliance:',
        bullets: [
          'Verifying attendance is marked from authorized locations via geofencing',
          'Maintaining audit trails for internal policy and labor regulation compliance',
          'Detecting and investigating unauthorized access or fraudulent attendance',
        ],
      },
    ],
  },
  {
    id: 'sharing',
    icon: 'share-social-outline',
    iconFamily: 'Ionicons',
    title: 'Data Sharing & Disclosure',
    content:
      'We do not sell, rent, or trade your personal data. Sharing is limited to the following:',
    bullets: [
      'HR and Admin Personnel – access employee records and attendance logs as required for their duties',
      'Managers and Team Leads – access attendance and module data for their direct reports only',
      'System Administrators – access technical logs for maintenance and security',
      'AWS – infrastructure and storage provider operating under strict data processing agreements',
      'Firebase Cloud Messaging – receives device push tokens only; no message content',
      'Legal / Regulatory Disclosure – only minimum data required to satisfy a lawful obligation',
    ],
  },
  {
    id: 'retention',
    icon: 'time-outline',
    iconFamily: 'Ionicons',
    title: 'Data Retention Policy',
    content: 'We retain personal data only as long as necessary for the purposes described or as required by law:',
    bullets: [
      'Attendance Records – retained indefinitely unless Company policy changes',
      'Messages & Uploaded Images – retained for 7 years',
      'Location Data (outside geofence) – retained for 2 years',
      'Device & System Logs – 90–180 days based on operational necessity',
      'Account Information – duration of employment + offboarding period',
      'Session Tokens – expire on logout or inactivity; not retained after expiry',
    ],
  },
  {
    id: 'offboarding',
    icon: 'person-remove-outline',
    iconFamily: 'Ionicons',
    title: 'Account Deletion & Offboarding',
    content:
      'Upon resignation, termination, retirement, or contract completion, the following process is followed:',
    bullets: [
      'Employee account is deactivated by HR, immediately revoking Application access',
      'Active session tokens are invalidated upon deactivation',
      'Open tasks, leads, and assets are transferred to designated active personnel',
      'Historical records are retained per the Data Retention Policy (Section above)',
      'Employees may request data deletion by contacting HR or the Application Administrator',
      'Certain records (e.g., attendance for payroll compliance) may be exempt from deletion under law',
    ],
  },
  {
    id: 'security',
    icon: 'shield-checkmark-outline',
    iconFamily: 'Ionicons',
    title: 'Data Storage & Security',
    content:
      'Our backend is hosted on Amazon Web Services (AWS). All data transmission is encrypted via HTTPS/TLS.',
    bullets: [
      'EC2 – compute services for application servers',
      'RDS – managed database with automated backups, failover, and encryption at rest',
      'S3 – secure object storage with access-controlled retrieval policies',
      'Role-based access control (RBAC) – employees access only data relevant to their role',
      'Principle of least privilege applied to all users and systems',
      'Administrative actions are logged and auditable',
      'Databases are not publicly exposed; accessible only via private networking',
      'Regular automated backups with periodic integrity testing',
    ],
  },
  {
    id: 'thirdparty',
    icon: 'git-network-outline',
    iconFamily: 'Ionicons',
    title: 'Third-Party Services',
    content:
      'The Application integrates with a limited number of third-party services. No analytics SDKs or advertising networks are integrated.',
    bullets: [
      'Firebase Cloud Messaging – push notification delivery (device token only)',
      'Expo Notification Services – cross-platform notification layer (device token only)',
      'Google Maps (future) – renders geofence boundaries in admin setup; no employee personal data shared',
      'Amazon Web Services – all application data; governed by AWS Data Processing Agreements',
    ],
  },
  {
    id: 'rights',
    icon: 'hand-left-outline',
    iconFamily: 'Ionicons',
    title: 'Your Employee Rights',
    content:
      'You have specific rights with respect to your personal data. Contact HR or the Application Administrator to exercise them:',
    bullets: [
      'Right to Access – request a summary of personal data we hold about you',
      'Right to Correction – request correction of inaccurate or incomplete records',
      'Right to Deletion – request deletion of your data (subject to legal exemptions)',
      'Right to Object – raise objections to data processing in writing to HR',
      'Right to Data Portability – receive a copy of your data in a structured, machine-readable format (where applicable under GDPR or DPDP)',
      'Requests are acknowledged within 5 business days and fulfilled within 30 days',
    ],
  },
  {
    id: 'legal',
    icon: 'scale-outline',
    iconFamily: 'Ionicons',
    title: 'Legal Basis for Processing',
    content: 'All data processing is grounded in one or more of the following legal bases:',
    bullets: [
      'Contractual Necessity – attendance and account data are necessary to perform the employment contract',
      'Legitimate Business Interest – workforce management, geofencing verification, and internal communications',
      'Legal Obligation – attendance records, financial documentation, and regulatory compliance',
      'Consent – biometric authentication and optional notification preferences (withdrawable at any time)',
    ],
  },
  {
    id: 'compliance',
    icon: 'ribbon-outline',
    iconFamily: 'Ionicons',
    title: 'Compliance with Data Protection Laws',
    content: 'We align our data practices with applicable legal frameworks:',
    bullets: [
      'India DPDP Act 2023 – lawful processing, data accuracy, security safeguards, and data principal rights',
      'GDPR Principles (where applicable) – lawfulness, purpose limitation, data minimization, accuracy, storage limitation, and accountability',
      'Periodic compliance reviews are conducted and this Policy updated as laws evolve',
    ],
  },
  {
    id: 'breach',
    icon: 'warning-outline',
    iconFamily: 'Ionicons',
    title: 'Data Breach & Incident Response',
    content:
      'In the event of a data security incident, we follow a structured response process:',
    bullets: [
      'Immediate containment to prevent further unauthorized access',
      'Assessment of scope, affected data, and number of impacted individuals',
      'Prompt notification to affected employees with details of what occurred and steps to take',
      'Regulatory authority notification within legally required timeframes (DPDP Act / GDPR)',
      'Remediation through root-cause corrections and updated security controls',
    ],
  },
  {
    id: 'transfers',
    icon: 'globe-outline',
    iconFamily: 'Ionicons',
    title: 'Cross-Border Data Transfers',
    content:
      'Our AWS infrastructure may process or store data in regions outside India (e.g., US or EU). We ensure adequate safeguards are in place, including AWS standard contractual clauses and compliance certifications. Contact the Administrator for details on your specific data storage region.',
  },
  {
    id: 'children',
    icon: 'alert-circle-outline',
    iconFamily: 'Ionicons',
    title: "Children's Privacy",
    content:
      'This Application is strictly for authorized adult employees. We do not knowingly collect data from individuals under 18 years of age. Accounts are created only in the context of a formal employment relationship. If data from a minor is discovered, it will be immediately deleted and the situation reviewed to prevent recurrence.',
  },
  {
    id: 'changes',
    icon: 'refresh-outline',
    iconFamily: 'Ionicons',
    title: 'Changes to This Policy',
    content:
      'We may update this Privacy Policy periodically to reflect changes in our practices, applicable law, or organizational operations.',
    bullets: [
      'Updated versions will be published within the Application with a revised date',
      'Employees will be notified of significant changes via in-app notification or email',
      'Continued use of the Application following notification constitutes acknowledgment of the updated Policy',
    ],
  },
  {
    id: 'contact',
    icon: 'mail-outline',
    iconFamily: 'Ionicons',
    title: 'Contact Information',
    content:
      'For any questions, concerns, or data rights requests related to this Privacy Policy, please contact:',
    bullets: [
      'Application Administrator / Data Contact',
      'prasanna@citadelnetinc.com',
      'Organization: Citadel Net Inc.',
      'Response Time: Within 5 business days',
    ],
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

        {/* Subsections */}
        {section.subsections && section.subsections.map((sub, si) => (
          <View key={si} style={styles.subsection}>
            <Text style={[styles.subsectionTitle, { color: C.bodyText }]}>{sub.title}</Text>
            <View style={styles.bulletList}>
              {sub.bullets.map((bullet, bi) => (
                <View key={bi} style={styles.bulletRow}>
                  <View style={[styles.bulletDot, { backgroundColor: C.lightGreen }]} />
                  <Text style={[styles.bulletText, { color: C.subText }]}>{bullet}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}
      </Animated.View>
    );
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
        {/* Meta banner */}
        <View style={[styles.dateBanner, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Ionicons name="calendar-outline" size={14} color={C.subText} />
          <Text style={[styles.dateBannerText, { color: C.subText }]}>
            Last Updated: March 2026 · Version 2.0 · Internal Use Only
          </Text>
        </View>

        {SECTIONS.map((section, index) => renderSection(section, index))}

        {/* Footer note */}
        <Text style={[styles.footerNote, { color: C.subText }]}>
          This policy may be updated periodically. Significant changes will be communicated via in-app notification or email. Continued use of the Application constitutes acknowledgment of the updated policy.
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

  // ── Subsections ───────────────────────────────────────────────────────────
  subsection: {
    marginTop: 14,
  },
  subsectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
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