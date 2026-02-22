// access/moduleDetails.tsx
import React, { useState, useCallback } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { ModuleItem, COLORS } from './types';
import { getModuleAccentColor } from './list';
import { BACKEND_URL } from '../../config/config';

interface ModuleDetailsProps {
  module: ModuleItem;
  token: string | null;
  onBack: () => void;
  onModuleUpdated: (updated: ModuleItem) => void;
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

  // Edit draft state
  const [draftName, setDraftName] = useState(initialModule.module_name);
  const [draftIconUri, setDraftIconUri] = useState<string | null>(null); // local URI picked by user

  const accent = getModuleAccentColor(module.module_unique_name);

  // ─── Enter edit mode ──────────────────────────────────────────────────────
  const enterEdit = useCallback(() => {
    setDraftName(module.module_name);
    setDraftIconUri(null);
    setIsEditing(true);
  }, [module.module_name]);

  // ─── Cancel edit ─────────────────────────────────────────────────────────
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
      // Nothing changed
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

  // ─── Current icon source ──────────────────────────────────────────────────
  const iconSource = draftIconUri ? { uri: draftIconUri } : module.module_icon ? { uri: module.module_icon } : null;

  // ─── Format date ──────────────────────────────────────────────────────────
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
      {/* ── Editing toolbar (shown when in edit mode) ── */}
      {isEditing && (
        <View style={styles.editToolbar}>
          <TouchableOpacity style={styles.cancelBtn} onPress={cancelEdit} disabled={saving}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.editToolbarTitle}>Edit Module</Text>
          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <Text style={styles.saveBtnText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* ── Module Header Card ── */}
        <View style={[styles.heroCard, { borderTopColor: accent }]}>
          {/* Edit button (top right, only when NOT editing) */}
          {!isEditing && (
            <TouchableOpacity style={styles.editFab} onPress={enterEdit} activeOpacity={0.8}>
              <Ionicons name="pencil" size={16} color={COLORS.white} />
            </TouchableOpacity>
          )}

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

          {/* Unique name tag */}
          <View style={[styles.uniqueTag, { backgroundColor: accent + '15' }]}>
            <Text style={[styles.uniqueTagText, { color: accent }]}>#{module.module_unique_name}</Text>
          </View>

          {/* Generic badge */}
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
            <Text style={styles.statValue}>{module.allowed_tags?.length ?? 0}</Text>
            <Text style={styles.statLabel}>Allowed Tags</Text>
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

        {/* ── Module ID Info ── */}
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

        {/* ── Allowed Tags ── */}
        {module.allowed_tags && module.allowed_tags.length > 0 && (
          <View style={styles.infoSection}>
            <Text style={styles.infoSectionTitle}>Allowed Tags</Text>
            <View style={styles.tagsContainer}>
              {module.allowed_tags.map((tag) => (
                <View key={tag.id} style={[styles.tagChip, { backgroundColor: accent + '15' }]}>
                  <Ionicons name="pricetag" size={12} color={accent} />
                  <Text style={[styles.tagChipText, { color: accent }]}>{tag.tag_name}</Text>
                  <Text style={styles.tagType}>({tag.tag_type})</Text>
                </View>
              ))}
            </View>
          </View>
        )}

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
  scroll: {
    flex: 1,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 3,
  },
  cancelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  cancelBtnText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  editToolbarTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  saveBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 10,
    minWidth: 64,
    alignItems: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.white,
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
  editFab: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 5,
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
  // Edit icon picker
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
  // Name input
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
    fontSize: 14,
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
  // Tags
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 5,
  },
  tagChipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  tagType: {
    fontSize: 11,
    color: COLORS.textTertiary,
  },
});

export default ModuleDetails;