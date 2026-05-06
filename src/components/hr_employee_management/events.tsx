import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Header } from './header';
import { WHATSAPP_COLORS, getAvatarColor, getInitials } from './constants';
import { BACKEND_URL } from '../../config/config';
import alert from '../../utils/Alert';

// ─── Types ────────────────────────────────────────────────────────────────────

interface EmployeeBasic {
  id: number;
  employee_id: string;
  first_name: string;
  last_name: string;
  designation?: string;
}

interface VisibilityConfig {
  employee: EmployeeBasic;
  is_controlled: boolean;
  birthday_viewers: EmployeeBasic[];
  anniversary_viewers: EmployeeBasic[];
}

interface VisibilityData {
  visibility_config: VisibilityConfig[];
}

interface EventsScreenProps {
  token: string;
  onBack: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fullName = (e: EmployeeBasic) => `${e.first_name} ${e.last_name}`;

// ─── Avatar ───────────────────────────────────────────────────────────────────

const Avatar: React.FC<{ employee: EmployeeBasic; size?: number }> = ({ employee, size = 40 }) => (
  <View
    style={[
      styles.avatar,
      {
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: getAvatarColor(employee.employee_id),
      },
    ]}
  >
    <Text style={[styles.avatarText, { fontSize: size * 0.35 }]}>
      {getInitials(fullName(employee))}
    </Text>
  </View>
);

// ─── Edit Visibility Screen ───────────────────────────────────────────────────

interface EditProps {
  config: VisibilityConfig;
  allEmployees: EmployeeBasic[];
  token: string;
  onBack: () => void;
  onSaved: () => void;
}

const EditVisibilityScreen: React.FC<EditProps> = ({
  config,
  allEmployees,
  token,
  onBack,
  onSaved,
}) => {
  const subject = config.employee;
  const eligible = allEmployees.filter(e => e.employee_id !== subject.employee_id);

  const initSet = (viewers: EmployeeBasic[]) =>
    config.is_controlled
      ? new Set(viewers.map(v => v.employee_id))
      : new Set(eligible.map(e => e.employee_id));

  const [birthdayViewers, setBirthdayViewers] = useState<Set<string>>(() =>
    initSet(config.birthday_viewers),
  );
  const [anniversaryViewers, setAnniversaryViewers] = useState<Set<string>>(() =>
    initSet(config.anniversary_viewers),
  );

  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [search, setSearch] = useState('');
  const [section, setSection] = useState<'birthday' | 'anniversary'>('birthday');

  const currentSet = section === 'birthday' ? birthdayViewers : anniversaryViewers;
  const setCurrentSet = section === 'birthday' ? setBirthdayViewers : setAnniversaryViewers;

  const filtered = search.trim()
    ? eligible.filter(
        e =>
          fullName(e).toLowerCase().includes(search.toLowerCase()) ||
          e.employee_id.toLowerCase().includes(search.toLowerCase()),
      )
    : eligible;

  const toggleViewer = (id: string) =>
    setCurrentSet(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const handleSave = async () => {
    setSaving(true);
    try {
      const body: Record<string, any> = { token, subject_id: subject.employee_id };

      const origB = new Set(
        config.is_controlled
          ? config.birthday_viewers.map(v => v.employee_id)
          : eligible.map(e => e.employee_id),
      );
      const origA = new Set(
        config.is_controlled
          ? config.anniversary_viewers.map(v => v.employee_id)
          : eligible.map(e => e.employee_id),
      );

      const bChanged = [...birthdayViewers].sort().join() !== [...origB].sort().join();
      const aChanged = [...anniversaryViewers].sort().join() !== [...origA].sort().join();

      if (!bChanged && !aChanged) {
        onBack();
        return;
      }
      if (bChanged) body.birthday_viewer_ids = [...birthdayViewers];
      if (aChanged) body.anniversary_viewer_ids = [...anniversaryViewers];

      const res = await fetch(`${BACKEND_URL}/manager/updateEventView`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        onSaved();
      } else {
        const err = await res.json().catch(() => ({ message: 'Failed to save' }));
        alert('Error', err.message || 'Failed to save changes');
      }
    } catch (e: any) {
      alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    alert(
      'Reset to Everyone',
      `Remove all restrictions so everyone can see ${subject.first_name}'s events?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            setResetting(true);
            try {
              const res = await fetch(`${BACKEND_URL}/manager/updateEventView`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, subject_id: subject.employee_id, reset: true }),
              });
              if (res.ok) {
                onSaved();
              } else {
                const err = await res.json().catch(() => ({ message: 'Reset failed' }));
                alert('Error', err.message);
              }
            } catch (e: any) {
              alert('Error', e.message);
            } finally {
              setResetting(false);
            }
          },
        },
      ],
    );
  };

  const selectedCount = currentSet.size;
  const totalCount = eligible.length;
  const allSelected = selectedCount === totalCount;

  return (
    <View style={editStyles.container}>
      <Header
        title="Event Visibility"
        subtitle={fullName(subject)}
        onBack={onBack}
        variant="details"
      />

      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Employee Card ── */}
        <View style={editStyles.empCard}>
          <Avatar employee={subject} size={56} />
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={editStyles.empName}>{fullName(subject)}</Text>
            {subject.designation ? (
              <Text style={editStyles.empDes}>{subject.designation}</Text>
            ) : null}
            <Text style={editStyles.empId}>{subject.employee_id}</Text>
          </View>
          <View
            style={[
              editStyles.statusBadge,
              config.is_controlled ? editStyles.statusBadgeControlled : editStyles.statusBadgeOpen,
            ]}
          >
            <Ionicons
              name={config.is_controlled ? 'lock-closed' : 'people'}
              size={11}
              color={config.is_controlled ? '#92400E' : '#065F46'}
            />
            <Text
              style={[
                editStyles.statusBadgeText,
                config.is_controlled
                  ? editStyles.statusBadgeTextControlled
                  : editStyles.statusBadgeTextOpen,
              ]}
            >
              {config.is_controlled ? 'Restricted' : 'Everyone'}
            </Text>
          </View>
        </View>

        {/* ── Section Toggle ── */}
        <View style={editStyles.sectionToggle}>
          {(['birthday', 'anniversary'] as const).map(s => {
            const active = section === s;
            const count = (s === 'birthday' ? birthdayViewers : anniversaryViewers).size;
            return (
              <TouchableOpacity
                key={s}
                style={[editStyles.sectionBtn, active && editStyles.sectionBtnActive]}
                onPress={() => setSection(s)}
                activeOpacity={0.75}
              >
                <Ionicons
                  name={s === 'birthday' ? 'gift-outline' : 'ribbon-outline'}
                  size={15}
                  color={active ? '#fff' : WHATSAPP_COLORS.textSecondary}
                />
                <Text
                  style={[editStyles.sectionBtnText, active && editStyles.sectionBtnTextActive]}
                >
                  {s === 'birthday' ? 'Birthday' : 'Anniversary'}
                </Text>
                <View style={[editStyles.countBadge, active && editStyles.countBadgeActive]}>
                  <Text
                    style={[editStyles.countBadgeText, active && editStyles.countBadgeTextActive]}
                  >
                    {count}/{totalCount}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Info Banner ── */}
        <View style={editStyles.infoBanner}>
          <Ionicons name="information-circle-outline" size={15} color="#4F46E5" />
          <Text style={editStyles.infoText}>
            Selected employees can see {subject.first_name}'s{' '}
            {section === 'birthday' ? 'birthday' : 'work anniversary'}. Deselecting all hides it
            completely.
          </Text>
        </View>

        {/* ── Bulk Actions ── */}
        <View style={editStyles.bulkRow}>
          <TouchableOpacity
            style={[editStyles.bulkBtn, allSelected && editStyles.bulkBtnDisabled]}
            onPress={() => setCurrentSet(new Set(eligible.map(e => e.employee_id)))}
            disabled={allSelected}
            activeOpacity={0.75}
          >
            <Ionicons
              name="checkmark-done-outline"
              size={14}
              color={allSelected ? WHATSAPP_COLORS.textTertiary : WHATSAPP_COLORS.primary}
            />
            <Text
              style={[
                editStyles.bulkBtnText,
                allSelected && { color: WHATSAPP_COLORS.textTertiary },
              ]}
            >
              Select All
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={editStyles.bulkBtn}
            onPress={() => setCurrentSet(new Set())}
            activeOpacity={0.75}
          >
            <Ionicons name="close-outline" size={14} color="#6B7280" />
            <Text style={[editStyles.bulkBtnText, { color: '#6B7280' }]}>Deselect All</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
          <Text style={editStyles.selectionCount}>
            {selectedCount} of {totalCount} selected
          </Text>
        </View>

        {/* ── Search ── */}
        <View style={editStyles.searchBox}>
          <Ionicons name="search" size={15} color={WHATSAPP_COLORS.textTertiary} />
          <TextInput
            style={editStyles.searchInput}
            placeholder="Search employees…"
            placeholderTextColor={WHATSAPP_COLORS.textTertiary}
            value={search}
            onChangeText={setSearch}
          />
          {!!search && (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={16} color={WHATSAPP_COLORS.textTertiary} />
            </TouchableOpacity>
          )}
        </View>

        {/* ── Employee List ── */}
        <View style={editStyles.listBox}>
          {filtered.length === 0 ? (
            <View style={editStyles.noResults}>
              <Ionicons name="search-outline" size={32} color="#D1D5DB" />
              <Text style={editStyles.noResultsText}>No employees found</Text>
            </View>
          ) : (
            filtered.map(emp => {
              const selected = currentSet.has(emp.employee_id);
              return (
                <TouchableOpacity
                  key={emp.employee_id}
                  style={[editStyles.empRow, selected && editStyles.empRowSelected]}
                  onPress={() => toggleViewer(emp.employee_id)}
                  activeOpacity={0.65}
                >
                  <Avatar employee={emp} size={38} />
                  <View style={editStyles.empRowMeta}>
                    <Text style={[editStyles.empRowName, selected && editStyles.empRowNameSel]}>
                      {fullName(emp)}
                    </Text>
                    {emp.designation ? (
                      <Text style={editStyles.empRowDes} numberOfLines={1}>
                        {emp.designation}
                      </Text>
                    ) : null}
                  </View>
                  <View style={[editStyles.checkbox, selected && editStyles.checkboxChecked]}>
                    {selected && <Ionicons name="checkmark" size={12} color="#fff" />}
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* ── Footer ── */}
      <View style={editStyles.footer}>
        <TouchableOpacity
          style={editStyles.resetBtn}
          onPress={handleReset}
          disabled={resetting || saving}
          activeOpacity={0.75}
        >
          {resetting ? (
            <ActivityIndicator size="small" color="#DC2626" />
          ) : (
            <>
              <Ionicons name="refresh-outline" size={15} color="#DC2626" />
              <Text style={editStyles.resetBtnText}>Reset</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[editStyles.saveBtn, (saving || resetting) && { opacity: 0.5 }]}
          onPress={handleSave}
          disabled={saving || resetting}
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
              <Text style={editStyles.saveBtnText}>Save Changes</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ─── Visibility Row ───────────────────────────────────────────────────────────

const VisibilityRow: React.FC<{
  config: VisibilityConfig;
  onPress: () => void;
}> = ({ config, onPress }) => {
  const { employee: emp, is_controlled, birthday_viewers, anniversary_viewers } = config;

  return (
    <TouchableOpacity style={styles.visRow} onPress={onPress} activeOpacity={0.7}>
      <Avatar employee={emp} size={46} />

      <View style={{ flex: 1, marginHorizontal: 12 }}>
        <Text style={styles.visRowName}>{fullName(emp)}</Text>
        {emp.designation ? (
          <Text style={styles.visRowDes} numberOfLines={1}>{emp.designation}</Text>
        ) : null}

        <View style={styles.visRowTags}>
          {is_controlled ? (
            <>
              <View style={styles.tagBirthday}>
                <Ionicons name="gift-outline" size={10} color="#B45309" />
                <Text style={styles.tagBirthdayText}>{birthday_viewers.length}</Text>
              </View>
              <View style={styles.tagAnniversary}>
                <Ionicons name="ribbon-outline" size={10} color="#6D28D9" />
                <Text style={styles.tagAnniversaryText}>{anniversary_viewers.length}</Text>
              </View>
              <View style={styles.tagRestricted}>
                <Ionicons name="lock-closed-outline" size={9} color="#92400E" />
                <Text style={styles.tagRestrictedText}>Restricted</Text>
              </View>
            </>
          ) : (
            <View style={styles.tagEveryone}>
              <Ionicons name="people-outline" size={10} color="#065F46" />
              <Text style={styles.tagEveryoneText}>Everyone</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.chevronBox}>
        <Ionicons name="chevron-forward" size={16} color={WHATSAPP_COLORS.textTertiary} />
      </View>
    </TouchableOpacity>
  );
};

// ─── Main Screen ─────────────────────────────────────────────────────────────

const EventsScreen: React.FC<EventsScreenProps> = ({ token, onBack }) => {
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<VisibilityData | null>(null);
  const [search, setSearch] = useState('');
  const [editingConfig, setEditingConfig] = useState<VisibilityConfig | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BACKEND_URL}/manager/getEvents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      if (res.ok) {
        setData(await res.json());
      } else {
        const err = await res.json().catch(() => ({ message: 'Failed to load' }));
        setError(err.message || 'Failed to load visibility config');
      }
    } catch (e: any) {
      setError(`Network error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const syncVisibility = async () => {
    setSyncing(true);
    try {
      const res = await fetch(`${BACKEND_URL}/manager/syncEventVisibility`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const json = await res.json();
      if (res.ok) {
        alert(
          'Sync Complete',
          `Created ${json.created} rows, removed ${json.deleted_stale} stale rows.`,
        );
        fetchData();
      } else {
        alert('Sync Failed', json.message || 'Sync failed');
      }
    } catch (e: any) {
      alert('Error', e.message);
    } finally {
      setSyncing(false);
    }
  };

  // ── Edit screen ──
  if (editingConfig) {
    const allEmployees = data?.visibility_config.map(vc => vc.employee) ?? [];
    return (
      <EditVisibilityScreen
        config={editingConfig}
        allEmployees={allEmployees}
        token={token}
        onBack={() => setEditingConfig(null)}
        onSaved={() => {
          setEditingConfig(null);
          fetchData();
        }}
      />
    );
  }

  // ── Loading ──
  if (loading) {
    return (
      <View style={styles.container}>
        <Header title="Event Visibility" subtitle="Loading…" onBack={onBack} variant="details" />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={WHATSAPP_COLORS.primary} />
          <Text style={styles.loadingText}>Fetching visibility config…</Text>
        </View>
      </View>
    );
  }

  // ── Error ──
  if (error) {
    return (
      <View style={styles.container}>
        <Header title="Event Visibility" subtitle="Error" onBack={onBack} variant="details" />
        <View style={styles.centered}>
          <View style={styles.errorIcon}>
            <Ionicons name="warning-outline" size={28} color="#DC2626" />
          </View>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchData}>
            <Ionicons name="refresh-outline" size={15} color="#fff" />
            <Text style={styles.retryBtnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const allConfigs = data?.visibility_config ?? [];
  const controlled = allConfigs.filter(vc => vc.is_controlled).length;
  const open = allConfigs.length - controlled;

  const filteredConfigs = search.trim()
    ? allConfigs.filter(vc => {
        const q = search.toLowerCase();
        return (
          fullName(vc.employee).toLowerCase().includes(q) ||
          vc.employee.employee_id.toLowerCase().includes(q)
        );
      })
    : allConfigs;

  return (
    <View style={styles.container}>
      <Header
        title="Event Visibility"
        subtitle={`${allConfigs.length} employees`}
        onBack={onBack}
        variant="details"
      />

      {/* ── Summary Cards ── */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, styles.summaryCardTotal]}>
          <Text style={[styles.summaryValue, { color: WHATSAPP_COLORS.primary }]}>
            {allConfigs.length}
          </Text>
          <Text style={[styles.summaryLabel, { color: WHATSAPP_COLORS.primary }]}>Total</Text>
        </View>
        <View style={[styles.summaryCard, styles.summaryCardOpen]}>
          <Text style={[styles.summaryValue, { color: '#059669' }]}>{open}</Text>
          <Text style={[styles.summaryLabel, { color: '#059669' }]}>Open</Text>
        </View>
        <View style={[styles.summaryCard, styles.summaryCardControlled]}>
          <Text style={[styles.summaryValue, { color: '#D97706' }]}>{controlled}</Text>
          <Text style={[styles.summaryLabel, { color: '#D97706' }]}>Restricted</Text>
        </View>
      </View>

      {/* ── Toolbar: Search + Sync ── */}
      <View style={styles.toolbar}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={15} color={WHATSAPP_COLORS.textTertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or ID…"
            placeholderTextColor={WHATSAPP_COLORS.textTertiary}
            value={search}
            onChangeText={setSearch}
          />
          {!!search && (
            <TouchableOpacity
              onPress={() => setSearch('')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close-circle" size={16} color={WHATSAPP_COLORS.textTertiary} />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={[styles.syncBtn, syncing && { opacity: 0.6 }]}
          onPress={syncVisibility}
          disabled={syncing}
          activeOpacity={0.75}
        >
          {syncing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="sync-outline" size={18} color="#fff" />
          )}
        </TouchableOpacity>
      </View>

      {/* ── Sync Hint ── */}
      <View style={styles.syncHint}>
        <Ionicons name="information-circle-outline" size={13} color="#4F46E5" />
        <Text style={styles.syncHintText}>
          Tap ↻ after adding or archiving employees to refresh the visibility table.
        </Text>
      </View>

      {/* ── List ── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {filteredConfigs.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Ionicons name="search-outline" size={28} color="#9CA3AF" />
            </View>
            <Text style={styles.emptyTitle}>No results found</Text>
            <Text style={styles.emptySubtitle}>Try a different name or employee ID.</Text>
          </View>
        ) : (
          filteredConfigs.map(vc => (
            <VisibilityRow
              key={vc.employee.employee_id}
              config={vc}
              onPress={() => setEditingConfig(vc)}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
};

export default EventsScreen;

// ─── Edit screen styles ───────────────────────────────────────────────────────

const editStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: WHATSAPP_COLORS.background },

  // Employee card
  empCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  empName: { fontSize: 16, fontWeight: '700', color: '#111827' },
  empDes: { fontSize: 13, color: WHATSAPP_COLORS.textSecondary, marginTop: 2 },
  empId: { fontSize: 11, color: WHATSAPP_COLORS.textTertiary, marginTop: 3 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 10,
  },
  statusBadgeOpen: { backgroundColor: '#D1FAE5' },
  statusBadgeControlled: { backgroundColor: '#FEF3C7' },
  statusBadgeText: { fontSize: 11, fontWeight: '700' },
  statusBadgeTextOpen: { color: '#065F46' },
  statusBadgeTextControlled: { color: '#92400E' },

  // Section toggle
  sectionToggle: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 4,
  },
  sectionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 9,
    gap: 6,
  },
  sectionBtnActive: { backgroundColor: WHATSAPP_COLORS.primary },
  sectionBtnText: { fontSize: 13, fontWeight: '600', color: WHATSAPP_COLORS.textSecondary },
  sectionBtnTextActive: { color: '#fff' },
  countBadge: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 7,
  },
  countBadgeActive: { backgroundColor: 'rgba(255,255,255,0.22)' },
  countBadgeText: { fontSize: 10, fontWeight: '700', color: '#6B7280' },
  countBadgeTextActive: { color: '#fff' },

  // Info banner
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#EEF2FF',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    borderRadius: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  infoText: { flex: 1, fontSize: 12, color: '#3730A3', lineHeight: 18 },

  // Bulk row
  bulkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 10,
    gap: 8,
  },
  bulkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  bulkBtnDisabled: { opacity: 0.45 },
  bulkBtnText: { fontSize: 12, fontWeight: '600', color: WHATSAPP_COLORS.primary },
  selectionCount: { fontSize: 12, color: WHATSAPP_COLORS.textTertiary, fontWeight: '500' },

  // Search
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    marginHorizontal: 16,
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: WHATSAPP_COLORS.border,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: WHATSAPP_COLORS.textPrimary, padding: 0 },

  // Employee list
  listBox: { marginHorizontal: 16 },
  noResults: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  noResultsText: { fontSize: 14, color: '#9CA3AF' },
  empRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: WHATSAPP_COLORS.border,
  },
  empRowSelected: {
    borderColor: WHATSAPP_COLORS.primary,
    backgroundColor: '#F0FDF4',
  },
  empRowMeta: { flex: 1, marginLeft: 10 },
  empRowName: { fontSize: 14, fontWeight: '600', color: '#1F2937' },
  empRowNameSel: { color: WHATSAPP_COLORS.primary },
  empRowDes: { fontSize: 12, color: WHATSAPP_COLORS.textSecondary, marginTop: 1 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  checkboxChecked: {
    backgroundColor: WHATSAPP_COLORS.primary,
    borderColor: WHATSAPP_COLORS.primary,
  },

  // Footer
  footer: {
    flexDirection: 'row',
    padding: 16,
    gap: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: WHATSAPP_COLORS.border,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
  },
  resetBtnText: { fontSize: 14, fontWeight: '600', color: '#DC2626' },
  saveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: WHATSAPP_COLORS.primary,
  },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});

// ─── Main screen styles ───────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: WHATSAPP_COLORS.background },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  loadingText: { marginTop: 14, fontSize: 15, color: WHATSAPP_COLORS.textSecondary },

  // Error
  errorIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  errorText: { fontSize: 14, color: '#DC2626', textAlign: 'center', lineHeight: 20 },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 20,
    backgroundColor: WHATSAPP_COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  retryBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },

  // Summary cards
  summaryRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    gap: 10,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  summaryCardTotal: { backgroundColor: '#F0FDF4' },
  summaryCardOpen: { backgroundColor: '#D1FAE5' },
  summaryCardControlled: { backgroundColor: '#FEF3C7' },
  summaryValue: { fontSize: 24, fontWeight: '800' },
  summaryLabel: { fontSize: 10, fontWeight: '600', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 },

  // Toolbar
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 10,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: WHATSAPP_COLORS.border,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: WHATSAPP_COLORS.textPrimary, padding: 0 },
  syncBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: WHATSAPP_COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Sync hint
  syncHint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#EEF2FF',
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 10,
    borderRadius: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  syncHintText: { flex: 1, fontSize: 11, color: '#3730A3', lineHeight: 16 },

  // Visibility row
  visRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginBottom: 8,
    borderRadius: 14,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  visRowName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  visRowDes: { fontSize: 12, color: WHATSAPP_COLORS.textSecondary, marginTop: 2 },
  visRowTags: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 6, flexWrap: 'wrap' },

  // Tags
  tagBirthday: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagBirthdayText: { fontSize: 10, fontWeight: '700', color: '#B45309' },
  tagAnniversary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagAnniversaryText: { fontSize: 10, fontWeight: '700', color: '#6D28D9' },
  tagRestricted: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  tagRestrictedText: { fontSize: 10, fontWeight: '700', color: '#92400E' },
  tagEveryone: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagEveryoneText: { fontSize: 10, fontWeight: '700', color: '#065F46' },

  chevronBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Avatar
  avatar: { alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '700' },

  // Empty
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 24 },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#374151' },
  emptySubtitle: { marginTop: 6, fontSize: 13, color: '#9CA3AF', textAlign: 'center', lineHeight: 19 },
});