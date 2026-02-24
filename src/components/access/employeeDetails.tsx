// access/employeeDetails.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Platform,
  StatusBar,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Employee, ModuleItem, COLORS } from './types';
import { getInitials, getAvatarColor, getModuleAccentColor } from './list';
import { BACKEND_URL } from '../../config/config';

interface EmployeeDetailsProps {
  employee: Employee;
  token: string | null;
  onBack: () => void;
}

interface ModuleWithAccess extends ModuleItem {
  access: boolean;
}

// ─── Animated Toggle Switch ───────────────────────────────────────────────────
interface ToggleSwitchProps {
  value: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ value, onToggle, disabled }) => {
  const translateX = useRef(new Animated.Value(value ? 36 : 0)).current;
  const backgroundOpacity = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateX, {
        toValue: value ? 36 : 0,
        useNativeDriver: true,
        tension: 80,
        friction: 10,
      }),
      Animated.timing(backgroundOpacity, {
        toValue: value ? 1 : 0,
        duration: 200,
        useNativeDriver: false,
      }),
    ]).start();
  }, [value]);

  const backgroundColor = backgroundOpacity.interpolate({
    inputRange: [0, 1],
    outputRange: [COLORS.border, COLORS.primary],
  });

  return (
    <TouchableOpacity
      onPress={onToggle}
      disabled={disabled}
      activeOpacity={0.85}
      style={styles.toggleWrapper}
    >
      <Animated.View style={[styles.toggleTrack, { backgroundColor }]}>
        {/* OFF label */}
        <Animated.Text
          style={[
            styles.toggleLabel,
            styles.toggleLabelOff,
            { opacity: backgroundOpacity.interpolate({ inputRange: [0, 0.5], outputRange: [1, 0], extrapolate: 'clamp' }) },
          ]}
        >
          OFF
        </Animated.Text>
        {/* ON label */}
        <Animated.Text
          style={[
            styles.toggleLabel,
            styles.toggleLabelOn,
            { opacity: backgroundOpacity.interpolate({ inputRange: [0.5, 1], outputRange: [0, 1], extrapolate: 'clamp' }) },
          ]}
        >
          ON
        </Animated.Text>
        {/* Knob */}
        <Animated.View
          style={[
            styles.toggleKnob,
            { transform: [{ translateX }] },
          ]}
        />
      </Animated.View>
    </TouchableOpacity>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const EmployeeDetails: React.FC<EmployeeDetailsProps> = ({ employee, token, onBack }) => {
  const [modules, setModules] = useState<ModuleWithAccess[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const name = employee.full_name || `${employee.first_name} ${employee.last_name ?? ''}`.trim();
  const initials = getInitials(name);
  const avatarColor = getAvatarColor(employee.employee_id);
  const statusBarHeight = Platform.OS === 'ios' ? 50 : StatusBar.currentHeight ?? 24;

  // ─── Fetch employee data with modules ───────────────────────────────────────
  const fetchData = useCallback(async (silent = false) => {
    if (!token) return;
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const response = await fetch(`${BACKEND_URL}/citadel_admin/getEmployeeData`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, employee_id: employee.employee_id }),
      });
      const data = await response.json();
      if (response.ok && data.modules) {
        setModules(data.modules as ModuleWithAccess[]);
      } else {
        Alert.alert('Error', data.message ?? 'Failed to load employee data');
      }
    } catch {
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, employee.employee_id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ─── Toggle access (grant or revoke silently) ───────────────────────────────
  const handleToggle = useCallback(async (mod: ModuleWithAccess) => {
    if (actionLoading) return;

    const willGrant = !mod.access;

    // Optimistically update UI immediately
    setModules((prev) =>
      prev.map((m) => (m.module_id === mod.module_id ? { ...m, access: willGrant } : m)),
    );
    setActionLoading(mod.module_id);

    try {
      const endpoint = willGrant ? 'grantAccess' : 'revokeAccess';
      const response = await fetch(`${BACKEND_URL}/citadel_admin/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          employee_id: employee.employee_id,
          module_id: mod.module_id,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        // Revert optimistic update on failure
        setModules((prev) =>
          prev.map((m) => (m.module_id === mod.module_id ? { ...m, access: !willGrant } : m)),
        );
        Alert.alert('Error', data.message ?? `Failed to ${willGrant ? 'grant' : 'revoke'} access`);
      }
    } catch {
      // Revert optimistic update on network error
      setModules((prev) =>
        prev.map((m) => (m.module_id === mod.module_id ? { ...m, access: !willGrant } : m)),
      );
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setActionLoading(null);
    }
  }, [token, employee.employee_id, actionLoading]);

  const accessCount = modules.filter((m) => m.access).length;

  const roleColor: Record<string, string> = {
    admin: '#0984e3',
    manager: '#6c5ce7',
    employee: COLORS.primary,
  };
  const empRoleColor = roleColor[employee.role] ?? COLORS.primary;

  // ─── Module item ────────────────────────────────────────────────────────────
  const renderModule = (mod: ModuleWithAccess, index: number) => {
    const accent = getModuleAccentColor(mod.module_unique_name);
    const isLast = index === modules.length - 1;

    return (
      <View key={mod.module_id} style={[styles.moduleRow, !isLast && styles.moduleRowBorder]}>
        {/* Left: Icon + Info */}
        <View style={[styles.modIconBg, { backgroundColor: accent + '18' }]}>
          {mod.module_icon ? (
            <Image source={{ uri: mod.module_icon }} style={styles.modIcon} resizeMode="contain" />
          ) : (
            <Ionicons name="grid-outline" size={20} color={accent} />
          )}
        </View>
        <View style={styles.modInfo}>
          <Text style={styles.modName} numberOfLines={1}>{mod.module_name}</Text>
          {mod.is_generic && (
            <Text style={styles.modGeneric}>Generic module</Text>
          )}
        </View>
        {/* Right: Animated Toggle */}
        <View style={styles.modAction}>
          <ToggleSwitch
            value={mod.access}
            onToggle={() => handleToggle(mod)}
            disabled={!!actionLoading}
          />
        </View>
      </View>
    );
  };

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      {/* ── Green Header ── */}
      <LinearGradient
        colors={[COLORS.primaryLight, COLORS.primary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: statusBarHeight + 8 }]}
      >
        <TouchableOpacity style={styles.backBtn} onPress={onBack} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>Employee Access</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>{name}</Text>
        </View>
        <View style={styles.headerRight} />
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchData(true)}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* ── Profile Card ── */}
        <View style={styles.profileCard}>
          {employee.profile_picture ? (
            <Image source={{ uri: employee.profile_picture }} style={styles.profilePic} />
          ) : (
            <View style={[styles.profileFallback, { backgroundColor: avatarColor }]}>
              <Text style={styles.profileInitials}>{initials}</Text>
            </View>
          )}
          <Text style={styles.profileName}>{name}</Text>
          {employee.designation ? (
            <Text style={styles.profileDesignation}>{employee.designation}</Text>
          ) : null}
          <Text style={styles.profileEmail}>{employee.email ?? 'No email'}</Text>
          <View style={styles.profileMeta}>
            <View style={[styles.roleChip, { backgroundColor: empRoleColor + '20' }]}>
              <Text style={[styles.roleChipText, { color: empRoleColor }]}>
                {employee.role.charAt(0).toUpperCase() + employee.role.slice(1)}
              </Text>
            </View>
            <View style={[styles.statusChip, employee.is_approved_by_admin ? styles.approvedChip : styles.pendingChip]}>
              <Ionicons
                name={employee.is_approved_by_admin ? 'shield-checkmark' : 'time'}
                size={12}
                color={employee.is_approved_by_admin ? COLORS.primary : COLORS.warning}
              />
              <Text style={[styles.statusChipText, employee.is_approved_by_admin ? styles.approvedText : styles.pendingText]}>
                {employee.is_approved_by_admin ? 'Approved' : 'Pending'}
              </Text>
            </View>
          </View>
          {/* Access summary */}
          {!loading && (
            <View style={styles.accessSummary}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{accessCount}</Text>
                <Text style={styles.summaryLabel}>Has Access</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryValue, { color: COLORS.textSecondary }]}>{modules.length - accessCount}</Text>
                <Text style={styles.summaryLabel}>No Access</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryValue, { color: COLORS.textSecondary }]}>{modules.length}</Text>
                <Text style={styles.summaryLabel}>Total</Text>
              </View>
            </View>
          )}
        </View>

        {/* ── Modules Permissions ── */}
        <View style={styles.modulesSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Module Permissions</Text>
            {!loading && (
              <View style={styles.sectionBadge}>
                <Text style={styles.sectionBadgeText}>{accessCount}/{modules.length}</Text>
              </View>
            )}
          </View>
          {loading ? (
            <View style={styles.sectionLoader}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.sectionLoaderText}>Loading modules...</Text>
            </View>
          ) : modules.length === 0 ? (
            <View style={styles.sectionEmpty}>
              <Ionicons name="grid-outline" size={40} color={COLORS.textTertiary} />
              <Text style={styles.sectionEmptyText}>No modules available</Text>
            </View>
          ) : (
            <View style={styles.modulesList}>
              {modules.map((mod, i) => renderModule(mod, i))}
            </View>
          )}
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  // ── Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  headerTitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 2,
  },
  headerRight: {
    width: 36,
  },
  // ── Scroll ──
  scroll: {
    flex: 1,
  },
  // ── Profile card ──
  profileCard: {
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
  },
  profilePic: {
    width: 88,
    height: 88,
    borderRadius: 44,
    marginBottom: 14,
    borderWidth: 3,
    borderColor: COLORS.primary + '40',
  },
  profileFallback: {
    width: 88,
    height: 88,
    borderRadius: 44,
    marginBottom: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  profileInitials: {
    color: COLORS.white,
    fontSize: 32,
    fontWeight: '700',
  },
  profileName: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 4,
  },
  profileDesignation: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 13,
    color: COLORS.textTertiary,
    marginBottom: 14,
  },
  profileMeta: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  roleChip: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  roleChipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 4,
  },
  approvedChip: { backgroundColor: COLORS.primary + '18' },
  pendingChip: { backgroundColor: COLORS.warning + '18' },
  statusChipText: { fontSize: 12, fontWeight: '600' },
  approvedText: { color: COLORS.primary },
  pendingText: { color: COLORS.warning },
  // Access summary
  accessSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
    width: '100%',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.primary,
  },
  summaryLabel: {
    fontSize: 11,
    color: COLORS.textTertiary,
    marginTop: 2,
    fontWeight: '500',
  },
  summaryDivider: {
    width: 1,
    height: 32,
    backgroundColor: COLORS.border,
  },
  // Modules section
  modulesSection: {
    marginHorizontal: 16,
    marginTop: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: 0.2,
  },
  sectionBadge: {
    backgroundColor: COLORS.primary + '18',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  sectionBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  sectionLoader: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 10,
  },
  sectionLoaderText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  sectionEmpty: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 10,
  },
  sectionEmptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  modulesList: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  moduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 12,
  },
  moduleRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modIconBg: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  modIcon: {
    width: 24,
    height: 24,
  },
  modInfo: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  modName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  modGeneric: {
    fontSize: 11,
    color: COLORS.textTertiary,
  },
  modAction: {
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // ── Animated Toggle ──
  toggleWrapper: {
    // extra tap area
  },
  toggleTrack: {
    width: 68,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    // labels sit inside the track
    overflow: 'hidden',
  },
  toggleLabel: {
    position: 'absolute',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  toggleLabelOn: {
    color: '#fff',
    left: 10,
  },
  toggleLabelOff: {
    color: COLORS.textTertiary,
    right: 10,
  },
  toggleKnob: {
    position: 'absolute',
    left: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
});

export default EmployeeDetails;