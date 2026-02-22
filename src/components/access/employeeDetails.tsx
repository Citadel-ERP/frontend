// access/employeeDetails.tsx
import React, { useState, useEffect, useCallback } from 'react';
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
} from 'react-native';
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

const EmployeeDetails: React.FC<EmployeeDetailsProps> = ({ employee, token, onBack }) => {
  const [modules, setModules] = useState<ModuleWithAccess[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null); // module_id being acted on

  const name = employee.full_name || `${employee.first_name} ${employee.last_name ?? ''}`.trim();
  const initials = getInitials(name);
  const avatarColor = getAvatarColor(employee.employee_id);

  // ─── Fetch employee data with modules ─────────────────────────────────────
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

  // ─── Grant access ─────────────────────────────────────────────────────────
  const handleGrant = useCallback((mod: ModuleWithAccess) => {
    Alert.alert(
      'Grant Access',
      `Give ${name} access to "${mod.module_name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Grant',
          style: 'default',
          onPress: async () => {
            setActionLoading(mod.module_id);
            try {
              const response = await fetch(`${BACKEND_URL}/citadel_admin/grantAccess`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  token,
                  employee_id: employee.employee_id,
                  module_id: mod.module_id,
                }),
              });
              const data = await response.json();
              if (response.ok) {
                setModules((prev) =>
                  prev.map((m) => (m.module_id === mod.module_id ? { ...m, access: true } : m)),
                );
                Alert.alert('Success', `Access granted to "${mod.module_name}"`);
              } else {
                Alert.alert('Error', data.message ?? 'Failed to grant access');
              }
            } catch {
              Alert.alert('Error', 'Network error. Please try again.');
            } finally {
              setActionLoading(null);
            }
          },
        },
      ],
    );
  }, [token, employee.employee_id, name]);

  // ─── Revoke access ────────────────────────────────────────────────────────
  const handleRevoke = useCallback((mod: ModuleWithAccess) => {
    Alert.alert(
      'Revoke Access',
      `Remove ${name}'s access to "${mod.module_name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(mod.module_id);
            try {
              const response = await fetch(`${BACKEND_URL}/citadel_admin/revokeAccess`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  token,
                  employee_id: employee.employee_id,
                  module_id: mod.module_id,
                }),
              });
              const data = await response.json();
              if (response.ok) {
                setModules((prev) =>
                  prev.map((m) => (m.module_id === mod.module_id ? { ...m, access: false } : m)),
                );
                Alert.alert('Success', `Access revoked for "${mod.module_name}"`);
              } else {
                Alert.alert('Error', data.message ?? 'Failed to revoke access');
              }
            } catch {
              Alert.alert('Error', 'Network error. Please try again.');
            } finally {
              setActionLoading(null);
            }
          },
        },
      ],
    );
  }, [token, employee.employee_id, name]);

  // ─── Computed ─────────────────────────────────────────────────────────────
  const accessCount = modules.filter((m) => m.access).length;
  const roleColor: Record<string, string> = {
    admin: '#0984e3',
    manager: '#6c5ce7',
    employee: COLORS.primary,
  };
  const empRoleColor = roleColor[employee.role] ?? COLORS.primary;

  // ─── Module item ──────────────────────────────────────────────────────────
  const renderModule = (mod: ModuleWithAccess, index: number) => {
    const accent = getModuleAccentColor(mod.module_unique_name);
    const isActing = actionLoading === mod.module_id;

    return (
      <View key={mod.module_id} style={[styles.moduleRow, index === 0 && styles.moduleRowFirst]}>
        {/* Icon */}
        <View style={[styles.modIconBg, { backgroundColor: accent + '18' }]}>
          {mod.module_icon ? (
            <Image source={{ uri: mod.module_icon }} style={styles.modIcon} resizeMode="contain" />
          ) : (
            <Ionicons name="grid-outline" size={20} color={accent} />
          )}
        </View>

        {/* Name & generic */}
        <View style={styles.modInfo}>
          <Text style={styles.modName} numberOfLines={1}>{mod.module_name}</Text>
          {mod.is_generic && (
            <Text style={styles.modGeneric}>Generic module</Text>
          )}
        </View>

        {/* Access status + action */}
        <View style={styles.modRight}>
          {/* Status pill */}
          <View style={[styles.statusPill, mod.access ? styles.statusHas : styles.statusNo]}>
            <Ionicons
              name={mod.access ? 'checkmark-circle' : 'close-circle'}
              size={12}
              color={mod.access ? COLORS.primary : COLORS.textTertiary}
            />
            <Text style={[styles.statusText, mod.access ? styles.statusHasText : styles.statusNoText]}>
              {mod.access ? 'Has Access' : 'No Access'}
            </Text>
          </View>

          {/* Action button */}
          {isActing ? (
            <ActivityIndicator size="small" color={COLORS.primary} style={styles.actionLoader} />
          ) : mod.access ? (
            <TouchableOpacity
              style={styles.revokeBtn}
              onPress={() => handleRevoke(mod)}
              activeOpacity={0.7}
              disabled={!!actionLoading}
            >
              <Ionicons name="remove-circle-outline" size={14} color={COLORS.danger} />
              <Text style={styles.revokeBtnText}>Revoke</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.grantBtn}
              onPress={() => handleGrant(mod)}
              activeOpacity={0.7}
              disabled={!!actionLoading}
            >
              <Ionicons name="add-circle-outline" size={14} color={COLORS.primary} />
              <Text style={styles.grantBtnText}>Grant</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
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

          {/* Role + status row */}
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
                <Text style={styles.summaryLabel}>Modules</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{modules.length - accessCount}</Text>
                <Text style={styles.summaryLabel}>No Access</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{modules.length}</Text>
                <Text style={styles.summaryLabel}>Total</Text>
              </View>
            </View>
          )}
        </View>

        {/* ── Modules List ── */}
        <View style={styles.modulesSection}>
          <Text style={styles.sectionTitle}>Module Permissions</Text>
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
  scroll: {
    flex: 1,
  },
  // Profile card
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 12,
    letterSpacing: 0.2,
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
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 10,
  },
  moduleRowFirst: {
    borderTopWidth: 0,
  },
  modIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  modIcon: {
    width: 26,
    height: 26,
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
  modRight: {
    alignItems: 'flex-end',
    gap: 5,
    flexShrink: 0,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
    gap: 3,
  },
  statusHas: {
    backgroundColor: COLORS.primary + '15',
  },
  statusNo: {
    backgroundColor: COLORS.border,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  statusHasText: { color: COLORS.primary },
  statusNoText: { color: COLORS.textTertiary },
  // Action buttons
  actionLoader: {
    marginTop: 2,
  },
  grantBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary + '18',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 4,
    borderWidth: 1,
    borderColor: COLORS.primary + '40',
  },
  grantBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  revokeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.danger + '12',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 4,
    borderWidth: 1,
    borderColor: COLORS.danger + '30',
  },
  revokeBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.danger,
  },
});

export default EmployeeDetails;