// access/moduleDetails.tsx
import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  TextInput,
  Platform,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { ModuleItem, Employee, COLORS } from './types';
import { getModuleAccentColor, getInitials, getAvatarColor } from './list';
import { BACKEND_URL } from '../../config/config';

interface ModuleDetailsProps {
  module: ModuleItem;
  token: string | null;
  onBack: () => void;
  onModuleUpdated: (updated: ModuleItem) => void;
}

interface ModuleUser {
  employee_id: string;
  full_name?: string;
  first_name: string;
  last_name?: string | null;
  email?: string | null;
  profile_picture?: string | null;
  designation?: string | null;
  role?: string;
}

const ModuleDetails: React.FC<ModuleDetailsProps> = ({
  module: initialModule,
  token,
  onBack,
  onModuleUpdated,
}) => {
  const [module, setModule] = useState<ModuleItem>(initialModule);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [moduleUsers, setModuleUsers] = useState<ModuleUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Edit draft state
  const [draftName, setDraftName] = useState(initialModule.module_name);
  const [draftIconUri, setDraftIconUri] = useState<string | null>(null);

  const accent = getModuleAccentColor(module.module_unique_name);
  const statusBarHeight = Platform.OS === 'ios' ? 50 : StatusBar.currentHeight ?? 24;

  // ─── Fetch users with access to this module ───────────────────────────────
  const fetchModuleUsers = useCallback(async (silent = false) => {
    if (!token) return;
    if (!silent) setUsersLoading(true);
    else setRefreshing(true);
    try {
      const response = await fetch(`${BACKEND_URL}/citadel_admin/getUsersOfModule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, module_id: module.module_id }),
      });
      const data = await response.json();
      if (response.ok && data.users) {
        setModuleUsers(data.users as ModuleUser[]);
      }
    } catch (err) {
      console.error('fetchModuleUsers error:', err);
    } finally {
      setUsersLoading(false);
      setRefreshing(false);
    }
  }, [token, module.module_id]);

  useEffect(() => { fetchModuleUsers(); }, [fetchModuleUsers]);

  // ─── Enter edit mode ──────────────────────────────────────────────────────
  const enterEdit = useCallback(() => {
    setDraftName(module.module_name);
    setDraftIconUri(null);
    setIsEditing(true);
  }, [module.module_name]);

  const cancelEdit = useCallback(() => {
    setDraftName(module.module_name);
    setDraftIconUri(null);
    setIsEditing(false);
  }, [module.module_name]);

  // ─── Pick image ───────────────────────────────────────────────────────────
  const handlePickImage = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission denied', 'Please allow access to your photo library in settings.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.length > 0) {
      setDraftIconUri(result.assets[0].uri);
    }
  }, []);

  // ─── Save changes ─────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    const trimmedName = draftName.trim();
    if (!trimmedName) {
      Alert.alert('Validation', 'Module name cannot be empty.');
      return;
    }
    if (trimmedName === module.module_name && !draftIconUri) {
      setIsEditing(false);
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('token', token ?? '');
      formData.append('module_id', module.module_id);
      if (trimmedName !== module.module_name) {
        formData.append('module_name', trimmedName);
      }
      if (draftIconUri) {
        const filename = draftIconUri.split('/').pop() ?? 'icon.jpg';
        const ext = filename.split('.').pop()?.toLowerCase() ?? 'jpg';
        const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';
        formData.append('module_icon', {
          uri: draftIconUri,
          name: filename,
          type: mimeType,
        } as any);
      }

      const response = await fetch(`${BACKEND_URL}/citadel_admin/updateModule`, {
        method: 'POST',
        headers: { 'Content-Type': 'multipart/form-data' },
        body: formData,
      });
      const data = await response.json();

      if (response.ok && data.module) {
        const updated: ModuleItem = { ...module, ...data.module };
        setModule(updated);
        onModuleUpdated(updated);
        setIsEditing(false);
        setDraftIconUri(null);
        Alert.alert('Success', 'Module updated successfully');
      } else {
        Alert.alert('Error', data.message ?? 'Failed to update module');
      }
    } catch {
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [draftName, draftIconUri, module, token, onModuleUpdated]);

  const iconSource = draftIconUri ? { uri: draftIconUri } : module.module_icon ? { uri: module.module_icon } : null;

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return iso;
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────
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
          <Text style={styles.headerTitle} numberOfLines={1}>Module Details</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>{module.module_name}</Text>
        </View>
        <TouchableOpacity
          style={[styles.editHeaderBtn, isEditing && styles.editHeaderBtnActive]}
          onPress={isEditing ? cancelEdit : enterEdit}
        >
          <Ionicons name={isEditing ? 'close' : 'pencil'} size={16} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      {/* ── Edit toolbar ── */}
      {isEditing && (
        <View style={styles.editToolbar}>
          <Text style={styles.editToolbarHint}>Editing module — make your changes below</Text>
          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <>
                <Ionicons name="checkmark" size={15} color="#fff" />
                <Text style={styles.saveBtnText}>Save</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchModuleUsers(true)}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* ── Module Hero Card ── */}
        <View style={[styles.heroCard, { borderTopColor: accent }]}>
          {/* Icon */}
          {isEditing ? (
            <TouchableOpacity style={[styles.iconPickerBtn, { borderColor: accent }]} onPress={handlePickImage} activeOpacity={0.8}>
              {iconSource ? (
                <Image source={iconSource} style={styles.heroIcon} resizeMode="contain" />
              ) : (
                <View style={[styles.heroIconFallback, { backgroundColor: accent + '20' }]}>
                  <Ionicons name="grid" size={36} color={accent} />
                </View>
              )}
              <View style={styles.iconOverlay}>
                <Ionicons name="camera" size={18} color={COLORS.white} />
              </View>
            </TouchableOpacity>
          ) : (
            <View style={[styles.heroIconWrapper, { backgroundColor: accent + '18' }]}>
              {iconSource ? (
                <Image source={iconSource} style={styles.heroIcon} resizeMode="contain" />
              ) : (
                <Ionicons name="grid" size={36} color={accent} />
              )}
            </View>
          )}

          {/* Name */}
          {isEditing ? (
            <View style={styles.nameInputWrapper}>
              <TextInput
                style={styles.nameInput}
                value={draftName}
                onChangeText={setDraftName}
                placeholder="Module name"
                placeholderTextColor={COLORS.textTertiary}
                autoFocus
                maxLength={100}
              />
              <Text style={styles.charCount}>{draftName.length}/100</Text>
            </View>
          ) : (
            <Text style={styles.heroName}>{module.module_name}</Text>
          )}

          <View style={[styles.uniqueTag, { backgroundColor: accent + '15' }]}>
            <Text style={[styles.uniqueTagText, { color: accent }]}>#{module.module_unique_name}</Text>
          </View>

          {module.is_generic && (
            <View style={styles.genericBadge}>
              <Ionicons name="star" size={12} color={COLORS.primary} />
              <Text style={styles.genericBadgeText}>Generic Module</Text>
            </View>
          )}
        </View>

        {/* ── Stats Row ── */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{moduleUsers.length}</Text>
            <Text style={styles.statLabel}>Users</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{module.is_generic ? 'Yes' : 'No'}</Text>
            <Text style={styles.statLabel}>Generic</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{formatDate(module.created_at)}</Text>
            <Text style={styles.statLabel}>Created</Text>
          </View>
        </View>

        {/* ── Module Information ── */}
        <View style={styles.infoSection}>
          <Text style={styles.infoSectionTitle}>Module Information</Text>
          <View style={styles.infoCard}>
            <InfoRow label="Module ID" value={module.module_id} mono />
            <InfoRow label="Unique Name" value={module.module_unique_name} mono />
            <InfoRow label="Display Name" value={module.module_name} />
            <InfoRow label="Generic" value={module.is_generic ? 'Yes' : 'No'} />
            <InfoRow label="Created" value={formatDate(module.created_at)} />
            <InfoRow label="Updated" value={formatDate(module.updated_at)} last />
          </View>
        </View>

        {/* ── Allowed Employees ── */}
        <View style={styles.infoSection}>
          <View style={styles.employeesSectionHeader}>
            <Text style={styles.infoSectionTitle}>Allowed Employees</Text>
            {!usersLoading && (
              <View style={styles.userCountBadge}>
                <Text style={styles.userCountText}>{moduleUsers.length}</Text>
              </View>
            )}
          </View>

          {usersLoading ? (
            <View style={styles.usersLoader}>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={styles.usersLoaderText}>Loading employees...</Text>
            </View>
          ) : moduleUsers.length === 0 ? (
            <View style={styles.usersEmpty}>
              <View style={styles.usersEmptyIcon}>
                <Ionicons name="people-outline" size={28} color={COLORS.textTertiary} />
              </View>
              <Text style={styles.usersEmptyTitle}>No Access Granted</Text>
              <Text style={styles.usersEmptySubtitle}>No employees have access to this module yet</Text>
            </View>
          ) : (
            <View style={styles.employeesGrid}>
              {moduleUsers.map((user) => {
                const displayName = user.full_name || `${user.first_name} ${user.last_name ?? ''}`.trim();
                const initials = getInitials(displayName);
                const avatarColor = getAvatarColor(user.employee_id);

                const roleColor: Record<string, string> = {
                  admin: '#0984e3',
                  manager: '#6c5ce7',
                  employee: COLORS.primary,
                };
                const userRoleColor = roleColor[user.role ?? 'employee'] ?? COLORS.primary;

                return (
                  <View key={user.employee_id} style={styles.employeeCard}>
                    {/* Avatar */}
                    {user.profile_picture ? (
                      <Image source={{ uri: user.profile_picture }} style={styles.empAvatar} />
                    ) : (
                      <View style={[styles.empAvatarFallback, { backgroundColor: avatarColor }]}>
                        <Text style={styles.empAvatarText}>{initials}</Text>
                      </View>
                    )}

                    {/* Name */}
                    <Text style={styles.empName} numberOfLines={1}>{displayName}</Text>

                    {/* Designation */}
                    {user.designation ? (
                      <Text style={styles.empDesignation} numberOfLines={1}>{user.designation}</Text>
                    ) : (
                      <Text style={styles.empDesignation} numberOfLines={1}>{user.email ?? ''}</Text>
                    )}

                    {/* Role chip */}
                    {user.role && (
                      <View style={[styles.empRoleChip, { backgroundColor: userRoleColor + '18' }]}>
                        <Text style={[styles.empRoleText, { color: userRoleColor }]}>
                          {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                        </Text>
                      </View>
                    )}

                    {/* Access indicator */}
                    <View style={styles.empAccessDot}>
                      <Ionicons name="checkmark-circle" size={14} color={COLORS.primary} />
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

// ─── Info Row ─────────────────────────────────────────────────────────────────
const InfoRow: React.FC<{ label: string; value: string; mono?: boolean; last?: boolean }> = ({
  label, value, mono, last,
}) => (
  <View style={[infoRowStyles.row, !last && infoRowStyles.border]}>
    <Text style={infoRowStyles.label}>{label}</Text>
    <Text style={[infoRowStyles.value, mono && infoRowStyles.mono]} numberOfLines={1}>{value}</Text>
  </View>
);

const infoRowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  border: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  label: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
    flexShrink: 0,
  },
  value: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
  },
  mono: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 13,
  },
});

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
  editHeaderBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editHeaderBtnActive: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  // Edit toolbar
  editToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    elevation: 3,
  },
  editToolbarHint: {
    fontSize: 13,
    color: COLORS.textSecondary,
    flex: 1,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    minWidth: 72,
    justifyContent: 'center',
    marginLeft: 12,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.white,
  },
  scroll: {
    flex: 1,
  },
  // Hero card
  heroCard: {
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderTopWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
    position: 'relative',
  },
  heroIconWrapper: {
    width: 90,
    height: 90,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  heroIcon: {
    width: 54,
    height: 54,
  },
  heroIconFallback: {
    width: 54,
    height: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconPickerBtn: {
    width: 90,
    height: 90,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    position: 'relative',
    overflow: 'hidden',
  },
  iconOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 30,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroName: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  nameInputWrapper: {
    width: '100%',
    marginBottom: 8,
  },
  nameInput: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  charCount: {
    fontSize: 11,
    color: COLORS.textTertiary,
    textAlign: 'right',
    marginTop: 2,
  },
  uniqueTag: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 8,
  },
  uniqueTagText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  genericBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary + '18',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 4,
    marginTop: 4,
  },
  genericBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  // Stats row
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 14,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textTertiary,
    marginTop: 3,
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    backgroundColor: COLORS.border,
    marginVertical: 10,
  },
  // Info section
  infoSection: {
    marginHorizontal: 16,
    marginTop: 20,
  },
  infoSectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  infoCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  // Employees section
  employeesSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  userCountBadge: {
    backgroundColor: COLORS.primary + '18',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  userCountText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  usersLoader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 32,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
  },
  usersLoaderText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  usersEmpty: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    gap: 8,
  },
  usersEmptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  usersEmptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  usersEmptySubtitle: {
    fontSize: 13,
    color: COLORS.textTertiary,
    textAlign: 'center',
  },
  // Employee grid cards
  employeesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  employeeCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    width: '47%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
    position: 'relative',
    gap: 4,
  },
  empAvatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    marginBottom: 4,
    borderWidth: 2,
    borderColor: COLORS.primary + '30',
  },
  empAvatarFallback: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  empAvatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  empName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  empDesignation: {
    fontSize: 11,
    color: COLORS.textTertiary,
    textAlign: 'center',
  },
  empRoleChip: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 2,
  },
  empRoleText: {
    fontSize: 10,
    fontWeight: '700',
  },
  empAccessDot: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
});

export default ModuleDetails;