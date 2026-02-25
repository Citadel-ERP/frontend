
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, TextInput,
  ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Asset, AssetFormData, SerialId } from '../types/asset.types';

export const CITY_OPTIONS = [
  { value: 'bangalore', label: 'Bangalore' },
  { value: 'chennai',   label: 'Chennai' },
  { value: 'delhi',     label: 'Delhi' },
  { value: 'gurgaon',   label: 'Gurgaon' },
  { value: 'hyderabad', label: 'Hyderabad' },
  { value: 'mumbai',    label: 'Mumbai' },
  { value: 'noida',     label: 'Noida' },
  { value: 'pune',      label: 'Pune' },
];

interface UpdateAssetModalProps {
  visible: boolean;
  asset: Asset | null;
  onClose: () => void;
  onSubmit: (id: number, data: Partial<AssetFormData>) => Promise<boolean>;
  onAddSerialIds: (assetId: number, serialIds: string[]) => Promise<{ success: boolean; message: string }>;
  onDeleteSerialId: (serialIdPk: number) => Promise<{ success: boolean; message: string }>;
  isDark?: boolean;
}

// ── Serial manager sub-component ─────────────────────────────────────────────

const SerialManager: React.FC<{
  asset: Asset;
  onAdd: (ids: string[]) => Promise<{ success: boolean; message: string }>;
  onDelete: (pk: number) => Promise<{ success: boolean; message: string }>;
  theme: any;
}> = ({ asset, onAdd, onDelete, theme: T }) => {
  const [input, setInput] = useState('');
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const feedbackTimer = useRef<any>(null);

  const showFeedback = (type: 'success' | 'error', msg: string) => {
    setFeedback({ type, msg });
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    feedbackTimer.current = setTimeout(() => setFeedback(null), 3000);
  };

  const handleAdd = async () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    // Support comma-separated bulk input
    const ids = trimmed.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
    if (ids.length === 0) return;
    setAdding(true);
    const result = await onAdd(ids);
    setAdding(false);
    if (result.success) {
      setInput('');
      showFeedback('success', `${ids.length} serial${ids.length > 1 ? 's' : ''} added`);
    } else {
      showFeedback('error', result.message);
    }
  };

  const handleDelete = async (serial: SerialId) => {
    if (serial.is_assigned) {
      showFeedback('error', `Cannot delete "${serial.serial_id}" — it is currently assigned`);
      return;
    }
    setDeletingId(serial.id);
    const result = await onDelete(serial.id);
    setDeletingId(null);
    if (!result.success) showFeedback('error', result.message);
  };

  const serials = asset.asset_serial_id ?? [];

  return (
    <View>
      {/* Section header */}
      <View style={[styles.sectionHeader, { backgroundColor: T.inputBg }]}>
        <Ionicons name="barcode-outline" size={16} color={T.accent} />
        <Text style={[styles.sectionTitle, { color: T.text }]}>Serial Numbers</Text>
        <View style={[styles.countPill, { backgroundColor: T.accent }]}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: '#fff' }}>{serials.length}</Text>
        </View>
      </View>

      {/* Feedback banner */}
      {feedback && (
        <View style={[styles.feedbackBanner, {
          backgroundColor: feedback.type === 'success' ? '#DCFCE7' : '#FEE2E2',
        }]}>
          <Ionicons
            name={feedback.type === 'success' ? 'checkmark-circle' : 'alert-circle'}
            size={15}
            color={feedback.type === 'success' ? '#16A34A' : '#DC2626'}
          />
          <Text style={{ fontSize: 13, color: feedback.type === 'success' ? '#16A34A' : '#DC2626', flex: 1 }}>
            {feedback.msg}
          </Text>
        </View>
      )}

      {/* Add input */}
      <View style={styles.addRow}>
        <TextInput
          style={[styles.serialInput, { backgroundColor: T.inputBg, borderColor: T.border, color: T.text, flex: 1 }]}
          placeholder="Add serial (comma-separate for bulk)"
          placeholderTextColor={T.sub}
          value={input}
          onChangeText={setInput}
          autoCapitalize="characters"
          onSubmitEditing={handleAdd}
          returnKeyType="done"
        />
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: adding || !input.trim() ? T.accent + '50' : T.accent }]}
          onPress={handleAdd}
          disabled={adding || !input.trim()}
        >
          {adding
            ? <ActivityIndicator size="small" color="#fff" />
            : <Ionicons name="add" size={22} color="#fff" />
          }
        </TouchableOpacity>
      </View>
      <Text style={{ fontSize: 11, color: T.sub, marginBottom: 12, marginTop: -6 }}>
        Tip: paste multiple serials separated by commas
      </Text>

      {/* Existing serials list */}
      {serials.length === 0 ? (
        <View style={[styles.emptySerials, { backgroundColor: T.inputBg }]}>
          <Ionicons name="barcode-outline" size={28} color={T.sub} />
          <Text style={{ fontSize: 13, color: T.sub, marginTop: 6 }}>No serial numbers yet</Text>
        </View>
      ) : (
        serials.map(serial => (
          <View key={serial.id} style={[styles.serialRow, { borderColor: T.border }]}>
            <View style={[styles.serialIconWrap, {
              backgroundColor: serial.is_assigned ? '#FFF7ED' : '#F0F9FF',
            }]}>
              <Ionicons
                name="barcode-outline"
                size={16}
                color={serial.is_assigned ? '#C2410C' : '#0369A1'}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{
                fontSize: 14, fontWeight: '700',
                color: serial.is_assigned ? '#C2410C' : '#0369A1',
                fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
                letterSpacing: 0.5,
              }}>
                {serial.serial_id}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 }}>
                <View style={[styles.statusDot, {
                  backgroundColor: serial.is_assigned ? '#F97316' : '#22C55E',
                }]} />
                <Text style={{ fontSize: 11, color: T.sub }}>
                  {serial.is_assigned ? 'Assigned' : 'Available'}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => handleDelete(serial)}
              disabled={deletingId === serial.id || serial.is_assigned}
              style={[styles.deleteSerialBtn, {
                opacity: serial.is_assigned ? 0.3 : 1,
                backgroundColor: '#FEE2E2',
              }]}
            >
              {deletingId === serial.id
                ? <ActivityIndicator size="small" color="#DC2626" />
                : <Ionicons name="trash-outline" size={15} color="#DC2626" />
              }
            </TouchableOpacity>
          </View>
        ))
      )}
    </View>
  );
};

// ── Main UpdateAssetModal ─────────────────────────────────────────────────────

export const UpdateAssetModal: React.FC<UpdateAssetModalProps> = ({
  visible, asset, onClose, onSubmit, onAddSerialIds, onDeleteSerialId, isDark = false,
}) => {
  const [form, setForm] = useState<Partial<AssetFormData>>({});
  const [loading, setLoading] = useState(false);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'serials'>('details');

  useEffect(() => {
    if (asset) {
      setForm({
        asset_name: asset.asset_name,
        asset_type: asset.asset_type,
        asset_description: asset.asset_description,
        asset_count: asset.asset_count.toString(),
        city: (asset.asset_city ?? asset.city ?? '').toLowerCase(),
      });
      setActiveTab('details');
    }
  }, [asset]);

  const T = {
    bg: isDark ? '#111a2d' : '#ffffff',
    inputBg: isDark ? '#1a2539' : '#f6f6f6',
    text: isDark ? '#ffffff' : '#333333',
    sub: isDark ? '#a0a0a0' : '#666666',
    accent: '#008069',
    border: isDark ? '#2a3549' : '#e0e0e0',
    tabActive: '#008069',
    tabInactive: isDark ? '#2a3549' : '#e0e0e0',
  };

  const handleSubmit = async () => {
    if (!asset?.id) return;
    setLoading(true);
    const success = await onSubmit(asset.id, form);
    setLoading(false);
    if (success) { setShowCityDropdown(false); onClose(); }
  };

  if (!asset) return null;

  const cityLabel = CITY_OPTIONS.find(c => c.value === form.city?.toLowerCase())?.label ?? form.city ?? 'Select city';

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: T.bg }]}>

          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={[styles.title, { color: T.text }]}>Edit Asset</Text>
              <Text style={{ fontSize: 12, color: T.sub, marginTop: 1 }}>
                {asset.asset_name.split('-')[0]}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={T.sub} />
            </TouchableOpacity>
          </View>

          {/* Tab switcher */}
          <View style={[styles.tabs, { backgroundColor: T.inputBg, borderColor: T.border }]}>
            {(['details', 'serials'] as const).map(tab => (
              <TouchableOpacity
                key={tab}
                style={[styles.tab, activeTab === tab && { backgroundColor: T.accent }]}
                onPress={() => setActiveTab(tab)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={tab === 'details' ? 'cube-outline' : 'barcode-outline'}
                  size={15}
                  color={activeTab === tab ? '#fff' : T.sub}
                />
                <Text style={{
                  fontSize: 13, fontWeight: '700',
                  color: activeTab === tab ? '#fff' : T.sub,
                  textTransform: 'capitalize',
                }}>
                  {tab}
                </Text>
                {tab === 'serials' && (asset.asset_serial_id?.length ?? 0) > 0 && (
                  <View style={[styles.tabBadge, {
                    backgroundColor: activeTab === tab ? 'rgba(255,255,255,0.3)' : T.accent,
                  }]}>
                    <Text style={{ fontSize: 10, fontWeight: '800', color: '#fff' }}>
                      {asset.asset_serial_id?.length}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {activeTab === 'details' ? (
              <>
                {/* Asset Name */}
                <View style={styles.group}>
                  <Text style={[styles.label, { color: T.text }]}>Asset Name</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: T.inputBg, color: T.text, borderColor: T.border }]}
                    value={form.asset_name} onChangeText={t => setForm(f => ({ ...f, asset_name: t }))}
                  />
                </View>
                {/* Asset Type */}
                <View style={styles.group}>
                  <Text style={[styles.label, { color: T.text }]}>Asset Type</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: T.inputBg, color: T.text, borderColor: T.border }]}
                    value={form.asset_type} onChangeText={t => setForm(f => ({ ...f, asset_type: t }))}
                  />
                </View>
                {/* Description */}
                <View style={styles.group}>
                  <Text style={[styles.label, { color: T.text }]}>Description</Text>
                  <TextInput
                    style={[styles.input, styles.textArea, { backgroundColor: T.inputBg, color: T.text, borderColor: T.border }]}
                    value={form.asset_description} onChangeText={t => setForm(f => ({ ...f, asset_description: t }))}
                    multiline numberOfLines={3}
                  />
                </View>
                {/* Count */}
                <View style={styles.group}>
                  <Text style={[styles.label, { color: T.text }]}>Count</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: T.inputBg, color: T.text, borderColor: T.border }]}
                    value={form.asset_count?.toString()} keyboardType="numeric"
                    onChangeText={t => setForm(f => ({ ...f, asset_count: t }))}
                  />
                </View>
                {/* City dropdown */}
                <View style={styles.group}>
                  <Text style={[styles.label, { color: T.text }]}>City</Text>
                  <TouchableOpacity
                    style={[styles.input, styles.dropdownTrigger, {
                      backgroundColor: T.inputBg,
                      borderColor: showCityDropdown ? T.accent : T.border,
                    }]}
                    onPress={() => setShowCityDropdown(p => !p)}
                  >
                    <Text style={{ fontSize: 15, flex: 1, color: form.city ? T.text : T.sub }}>
                      {cityLabel}
                    </Text>
                    <Ionicons name={showCityDropdown ? 'chevron-up' : 'chevron-down'} size={17} color={T.sub} />
                  </TouchableOpacity>
                  {showCityDropdown && (
                    <View style={[styles.dropdown, { backgroundColor: T.bg, borderColor: T.border }]}>
                      {CITY_OPTIONS.map(opt => {
                        const selected = form.city?.toLowerCase() === opt.value;
                        return (
                          <TouchableOpacity
                            key={opt.value}
                            style={[styles.dropdownItem, selected && { backgroundColor: T.accent + '20' }]}
                            onPress={() => { setForm(f => ({ ...f, city: opt.value })); setShowCityDropdown(false); }}
                          >
                            <Text style={{ fontSize: 15, fontWeight: '500', color: selected ? T.accent : T.text }}>
                              {opt.label}
                            </Text>
                            {selected && <Ionicons name="checkmark" size={17} color={T.accent} />}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </View>
              </>
            ) : (
              <SerialManager
                asset={asset}
                onAdd={(ids) => onAddSerialIds(asset.id, ids)}
                onDelete={onDeleteSerialId}
                theme={T}
              />
            )}
          </ScrollView>

          {activeTab === 'details' && (
            <View style={[styles.footer, { borderTopColor: T.border }]}>
              <TouchableOpacity
                style={[styles.btn, { borderWidth: 1, borderColor: T.border }]}
                onPress={onClose}
              >
                <Text style={[styles.btnText, { color: T.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: T.accent }]}
                onPress={handleSubmit} disabled={loading}
              >
                <Text style={[styles.btnText, { color: 'white' }]}>
                  {loading ? 'Saving...' : 'Save Changes'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '92%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  title: { fontSize: 20, fontWeight: '700' },
  tabs: { flexDirection: 'row', borderRadius: 12, padding: 4, borderWidth: 1, marginBottom: 18, gap: 4 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 9, borderRadius: 9 },
  tabBadge: { width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  group: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 7 },
  input: { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 15 },
  textArea: { minHeight: 76, textAlignVertical: 'top' },
  dropdownTrigger: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dropdown: { borderWidth: 1, borderRadius: 12, marginTop: 4, overflow: 'hidden', elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8 },
  dropdownItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(0,0,0,0.06)' },
  footer: { flexDirection: 'row', gap: 12, marginTop: 16, paddingTop: 16, borderTopWidth: 1 },
  btn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  btnText: { fontSize: 15, fontWeight: '700' },
  // Serial manager styles
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 10, marginBottom: 14 },
  sectionTitle: { fontSize: 14, fontWeight: '700', flex: 1 },
  countPill: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  feedbackBanner: { flexDirection: 'row', alignItems: 'center', gap: 7, padding: 10, borderRadius: 10, marginBottom: 12 },
  addRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  serialInput: { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 14 },
  addBtn: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  emptySerials: { alignItems: 'center', padding: 24, borderRadius: 12, marginBottom: 8 },
  serialRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, marginBottom: 2 },
  serialIconWrap: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  deleteSerialBtn: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
});