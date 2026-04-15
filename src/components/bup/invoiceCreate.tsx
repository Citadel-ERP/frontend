/**
 * invoiceCreate.tsx  (fixed)
 *
 * Fixes applied:
 *  1. Props changed from Modal-style (visible/onClose/onCancel/onInvoiceCreated)
 *     to screen-style (onBack/onCreated) to match how LeadDetails renders it.
 *  2. Outer <Modal> wrapper removed – LeadDetails controls view-switching.
 *  3. Success check now uses `response.ok` (covers 200-299 incl. 201)
 *     instead of an exact message-string comparison.
 *  4. Green status-bar area: SafeAreaView edges={['top']} with
 *     backgroundColor={C.primary}, matching LeadDetails header pattern.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { BACKEND_URL } from '../../config/config';
import { ThemeColors } from './types';

// ─── Colour palette ────────────────────────────────────────────────────────
const C = {
  primary:       '#075E54',
  primaryLight:  '#128C7E',
  primaryDark:   '#054D44',
  secondary:     '#25D366',
  danger:        '#EF4444',
  background:    '#f0f0f0',
  surface:       '#FFFFFF',
  textPrimary:   '#1F2937',
  textSecondary: '#6B7280',
  textTertiary:  '#9CA3AF',
  border:        '#E5E7EB',
  inputBg:       '#F9FAFB',
};

// ─── Types ────────────────────────────────────────────────────────────────
type InvoiceType = 'complete' | 'partial' | 'other';

const TYPE_OPTIONS: { value: InvoiceType; label: string }[] = [
  { value: 'complete', label: 'Complete – Full invoice for entire amount' },
  { value: 'partial',  label: 'Partial – Invoice for a portion of amount' },
  { value: 'other',    label: 'Other – Custom invoice type' },
];

const TYPE_DISPLAY: Record<InvoiceType, string> = {
  complete: 'Complete',
  partial:  'Partial',
  other:    'Other',
};

const formatFileSize = (bytes?: number): string => {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

// ─── Field component – defined OUTSIDE parent so it never remounts ─────────
interface FieldProps {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  multiline?: boolean;
  required?: boolean;
  keyboardType?: any;
  error?: string;
}

const Field: React.FC<FieldProps> = ({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
  required,
  keyboardType,
  error,
}) => (
  <View style={s.fieldWrap}>
    <Text style={s.fieldLabel}>
      {label}
      {required && <Text style={s.required}> *</Text>}
    </Text>
    <TextInput
      style={[s.input, multiline && s.inputMultiline, error ? s.inputErr : null]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={C.textTertiary}
      multiline={multiline}
      scrollEnabled={false}
      keyboardType={keyboardType}
      textAlignVertical={multiline ? 'top' : 'center'}
    />
    {!!error && (
      <View style={s.errRow}>
        <Ionicons name="alert-circle" size={12} color={C.danger} />
        <Text style={s.errText}>{error}</Text>
      </View>
    )}
  </View>
);

// ─── SectionLabel – also outside to avoid remount ─────────────────────────
const SectionLabel = ({ icon, text }: { icon: string; text: string }) => (
  <View style={s.sectionLabel}>
    <MaterialIcons name={icon as any} size={16} color={C.primary} />
    <Text style={s.sectionLabelText}>{text}</Text>
  </View>
);

// ─── Props ─────────────────────────────────────────────────────────────────
// FIX 1: Props now match what LeadDetails actually passes.
interface CreateInvoiceProps {
  leadId: number;
  leadName: string;
  token: string | null;
  theme: ThemeColors;
  onBack: () => void;       // was: onClose + onCancel
  onCreated: () => void;    // was: onInvoiceCreated
}

// ─── Main component ────────────────────────────────────────────────────────
const CreateInvoice: React.FC<CreateInvoiceProps> = ({
  leadId,
  leadName,
  token,
  theme,
  onBack,
  onCreated,
}) => {
  const [loading, setLoading]               = useState(false);
  const [isPickerActive, setIsPickerActive] = useState(false);
  const [selectedFiles, setSelectedFiles]   = useState<DocumentPicker.DocumentPickerAsset[]>([]);
  const [invoiceType, setInvoiceType]       = useState<InvoiceType>('complete');
  const [showTypePicker, setShowTypePicker] = useState(false);

  const [formData, setFormData] = useState({
    vendor_name:                  '',
    vendor_gst_or_pan:            '',
    billing_area:                 '',
    property_type:                '',
    car_parking:                  '',
    particular_matter_to_mention: '',
    executive_name:               '',
    other_type_description:       '',
  });

  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});

  // ── Helpers ────────────────────────────────────────────────────────────
  const setField = (key: keyof typeof formData) => (value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    setErrors(prev => ({ ...prev, [key]: undefined }));
  };

  // ── File picker ────────────────────────────────────────────────────────
  const handleAttachFiles = async () => {
    if (isPickerActive) return;
    setIsPickerActive(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        multiple: true,
        type: '*/*',
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets?.length) {
        setSelectedFiles(prev => [...prev, ...result.assets]);
      }
    } catch {
      Alert.alert('Error', 'Failed to pick documents. Please try again.');
    } finally {
      setIsPickerActive(false);
    }
  };

  const handleRemoveFile = (index: number) =>
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));

  // ── Validation ─────────────────────────────────────────────────────────
  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!formData.vendor_name.trim())       e.vendor_name       = 'Vendor name is required';
    if (!formData.vendor_gst_or_pan.trim()) e.vendor_gst_or_pan = 'GST / PAN is required';
    if (!formData.billing_area.trim())      e.billing_area      = 'Billing area is required';
    if (!formData.property_type.trim())     e.property_type     = 'Property type is required';
    if (invoiceType === 'other' && !formData.other_type_description.trim())
      e.other_type_description = 'Please describe the invoice type';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Submit ─────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!token) { Alert.alert('Error', 'Authentication token not found'); return; }
    if (!validate()) return;

    try {
      setLoading(true);
      const data = new FormData();
      data.append('token',             token);
      data.append('lead_id',           leadId.toString());
      data.append('type',              invoiceType);
      data.append('vendor_name',       formData.vendor_name.trim());
      data.append('vendor_gst_or_pan', formData.vendor_gst_or_pan.trim());
      data.append('billing_area',      formData.billing_area.trim());
      data.append('property_type',     formData.property_type.trim());

      if (formData.car_parking.trim())
        data.append('car_parking', formData.car_parking.trim());
      if (formData.executive_name.trim())
        data.append('executive_name', formData.executive_name.trim());
      if (formData.particular_matter_to_mention.trim())
        data.append('particular_matter_to_mention', formData.particular_matter_to_mention.trim());
      if (invoiceType === 'other' && formData.other_type_description.trim())
        data.append('other_type_description', formData.other_type_description.trim());

      selectedFiles.forEach(file => {
        data.append('files', {
          uri:  file.uri,
          type: file.mimeType || 'application/octet-stream',
          name: file.name,
        } as any);
      });

      const response = await fetch(`${BACKEND_URL}/manager/createInvoice`, {
        method: 'POST',
        body: data,
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      // FIX 2: Trust HTTP status (ok = 200-299, covers 201 Created).
      // Do NOT rely on an exact message string from the body.
      if (response.ok) {
        Alert.alert('Success', 'Invoice created successfully!');
        onCreated();
        onBack();
      } else {
        let msg = 'Failed to create invoice.';
        try { const e = await response.json(); msg = e.message || msg; } catch {}
        Alert.alert('Error', msg);
      }
    } catch {
      Alert.alert('Error', 'Failed to create invoice. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Cancel ─────────────────────────────────────────────────────────────
  const handleCancel = () => {
    Alert.alert(
      'Discard Invoice?',
      'All entered information will be lost.',
      [
        { text: 'Keep Editing', style: 'cancel' },
        // FIX 1: use onBack instead of the now-removed onCancel/onClose props
        { text: 'Discard', style: 'destructive', onPress: onBack },
      ]
    );
  };

  // ── Render ─────────────────────────────────────────────────────────────
  // FIX 2 & 3: No outer <Modal> – LeadDetails handles view switching.
  // SafeAreaView edges={['top']} + backgroundColor={C.primary} makes the
  // status-bar / notch area green, exactly like the LeadDetails header.
  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.primary} />

      {/* FIX 3: Green status-bar area */}
      <SafeAreaView style={s.headerSafeArea} edges={['top']}>
        <View style={s.header}>
          <TouchableOpacity style={s.headerCancel} onPress={handleCancel} disabled={loading}>
            <Text style={s.headerCancelText}>Cancel</Text>
          </TouchableOpacity>

          <View style={s.headerCenter}>
            <Text style={s.headerTitle}>Create Invoice</Text>
            <Text style={s.headerSub} numberOfLines={1}>{leadName}</Text>
          </View>

          <TouchableOpacity
            style={[s.headerSave, loading && s.headerSaveDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#FFF" size="small" />
              : <Text style={s.headerSaveText}>Save</Text>
            }
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* ── Body ── */}
      <KeyboardAvoidingView
        style={s.body}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >

          {/* ── Invoice Type dropdown ── */}
          <View style={s.card}>
            <SectionLabel icon="receipt" text="Invoice Type" />

            <Text style={s.fieldLabel}>
              Type <Text style={s.required}>*</Text>
            </Text>
            <TouchableOpacity
              style={s.dropdown}
              onPress={() => setShowTypePicker(true)}
              activeOpacity={0.75}
            >
              <Text style={s.dropdownText}>{TYPE_DISPLAY[invoiceType]}</Text>
              <Ionicons name="chevron-down" size={18} color={C.textSecondary} />
            </TouchableOpacity>

            {invoiceType === 'other' && (
              <View style={{ marginTop: 14 }}>
                <Field
                  label="Describe Invoice Type"
                  value={formData.other_type_description}
                  onChangeText={setField('other_type_description')}
                  placeholder="e.g. Advance, Retention, Amendment…"
                  multiline
                  required
                  error={errors.other_type_description}
                />
              </View>
            )}
          </View>

          {/* ── Vendor Information ── */}
          <View style={s.card}>
            <SectionLabel icon="business" text="Vendor Information" />
            <Field
              label="Vendor Name"
              value={formData.vendor_name}
              onChangeText={setField('vendor_name')}
              placeholder="e.g. Prestige Estates Pvt. Ltd."
              required
              error={errors.vendor_name}
            />
            <Field
              label="GST / PAN Number"
              value={formData.vendor_gst_or_pan}
              onChangeText={setField('vendor_gst_or_pan')}
              placeholder="e.g. 29ABCDE1234F1Z5"
              required
              error={errors.vendor_gst_or_pan}
            />
          </View>

          {/* ── Property Details ── */}
          <View style={s.card}>
            <SectionLabel icon="home-work" text="Property Details" />
            <Field
              label="Property Type (SEZ / Non-SEZ)"
              value={formData.property_type}
              onChangeText={setField('property_type')}
              placeholder="e.g. Commercial Office – Non SEZ"
              required
              error={errors.property_type}
            />
            <Field
              label="Billing Area & Rate"
              value={formData.billing_area}
              onChangeText={setField('billing_area')}
              placeholder="e.g. 5,000 sq ft @ ₹80/sq ft/month"
              multiline
              required
              error={errors.billing_area}
            />
            <Field
              label="Car Parking"
              value={formData.car_parking}
              onChangeText={setField('car_parking')}
              placeholder="e.g. 10 slots (optional)"
            />
          </View>

          {/* ── Additional Details ── */}
          <View style={s.card}>
            <SectionLabel icon="person" text="Additional Details" />
            <Field
              label="Ref. Executive Name"
              value={formData.executive_name}
              onChangeText={setField('executive_name')}
              placeholder="Name of the executive to mention"
            />
            <Field
              label="Particular Matter to Mention in Narration"
              value={formData.particular_matter_to_mention}
              onChangeText={setField('particular_matter_to_mention')}
              placeholder="Any clauses, special conditions, or remarks…"
              multiline
            />
          </View>

          {/* ── Attachments ── */}
          <View style={s.card}>
            <SectionLabel icon="attach-file" text="Supporting Documents" />
            <Text style={s.attachHint}>LOI, Sale Deed, or any relevant files</Text>

            <TouchableOpacity
              style={s.attachBtn}
              onPress={handleAttachFiles}
              disabled={isPickerActive}
              activeOpacity={0.75}
            >
              <View style={s.attachBtnIcon}>
                <Ionicons name="cloud-upload-outline" size={22} color={C.primary} />
              </View>
              <View>
                <Text style={s.attachBtnTitle}>
                  Attach Files{selectedFiles.length > 0 ? ` (${selectedFiles.length})` : ''}
                </Text>
                <Text style={s.attachBtnSub}>PDF, images, spreadsheets…</Text>
              </View>
            </TouchableOpacity>

            {selectedFiles.length > 0 && (
              <View style={s.fileList}>
                {selectedFiles.map((file, idx) => (
                  <View key={idx} style={s.fileItem}>
                    <View style={s.fileItemIcon}>
                      <MaterialIcons name="insert-drive-file" size={18} color={C.primary} />
                    </View>
                    <View style={s.fileItemInfo}>
                      <Text style={s.fileItemName} numberOfLines={1}>{file.name}</Text>
                      <Text style={s.fileItemSize}>{formatFileSize(file.size)}</Text>
                    </View>
                    <TouchableOpacity onPress={() => handleRemoveFile(idx)} style={s.fileItemRemove}>
                      <Ionicons name="close-circle" size={20} color={C.danger} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>

          <Text style={s.requiredNote}>* Required fields</Text>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Type picker bottom-sheet ── */}
      <Modal
        visible={showTypePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTypePicker(false)}
      >
        <TouchableOpacity
          style={s.pickerOverlay}
          activeOpacity={1}
          onPress={() => setShowTypePicker(false)}
        >
          <View style={s.pickerSheet}>
            <View style={s.pickerHandle} />
            <Text style={s.pickerTitle}>Select Invoice Type</Text>

            {TYPE_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  s.pickerOption,
                  invoiceType === opt.value && s.pickerOptionSelected,
                ]}
                onPress={() => {
                  setInvoiceType(opt.value);
                  setShowTypePicker(false);
                }}
              >
                <Text style={[
                  s.pickerOptionText,
                  invoiceType === opt.value && s.pickerOptionTextSelected,
                ]}>
                  {opt.label}
                </Text>
                {invoiceType === opt.value && (
                  <Ionicons name="checkmark" size={18} color={C.primary} />
                )}
              </TouchableOpacity>
            ))}

            <View style={{ height: Platform.OS === 'ios' ? 20 : 8 }} />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

// ─── Styles ────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  // FIX 3: root fills the screen; headerSafeArea colours the notch green
  root:           { flex: 1, backgroundColor: C.background },
  headerSafeArea: { backgroundColor: C.primary },
  body:           { flex: 1, backgroundColor: C.background },

  // Header bar
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 56,
    borderBottomWidth: 1,
    borderBottomColor: C.primaryDark,
  },
  headerCancel:     { paddingHorizontal: 10, paddingVertical: 6 },
  headerCancelText: { fontSize: 15, color: 'rgba(255,255,255,0.85)', fontWeight: '500' },
  headerCenter:     { flex: 1, alignItems: 'center' },
  headerTitle:      { fontSize: 16, fontWeight: '700', color: '#FFF' },
  headerSub:        { fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 1 },
  headerSave: {
    backgroundColor: C.secondary,
    paddingHorizontal: 18,
    paddingVertical: 7,
    borderRadius: 8,
    minWidth: 62,
    alignItems: 'center',
  },
  headerSaveDisabled: { opacity: 0.6 },
  headerSaveText:     { fontSize: 15, fontWeight: '700', color: '#FFF' },

  // Scroll
  scroll:        { flex: 1 },
  scrollContent: { padding: 14, paddingBottom: 50 },

  // Card
  card: {
    backgroundColor: C.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },

  // Section label
  sectionLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  sectionLabelText: {
    fontSize: 13,
    fontWeight: '700',
    color: C.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Dropdown trigger
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.inputBg,
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 10,
    paddingHorizontal: 13,
    paddingVertical: Platform.OS === 'ios' ? 13 : 10,
    minHeight: 48,
  },
  dropdownText: { fontSize: 15, color: C.textPrimary, fontWeight: '500' },

  // Field
  fieldWrap:      { marginBottom: 14 },
  fieldLabel:     { fontSize: 13, fontWeight: '600', color: C.textSecondary, marginBottom: 6 },
  required:       { color: C.danger },
  input: {
    backgroundColor: C.inputBg,
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 10,
    paddingHorizontal: 13,
    paddingVertical: Platform.OS === 'ios' ? 12 : 9,
    fontSize: 15,
    color: C.textPrimary,
    minHeight: 48,
  },
  inputMultiline: { minHeight: 80, paddingTop: 12 },
  inputErr:       { borderColor: C.danger, backgroundColor: '#FFF5F5' },
  errRow:         { flexDirection: 'row', alignItems: 'center', marginTop: 5, gap: 4 },
  errText:        { fontSize: 12, color: C.danger },

  // Attach
  attachHint: { fontSize: 12, color: C.textSecondary, marginBottom: 10, marginTop: -6 },
  attachBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1.5,
    borderColor: C.primary + '50',
    borderStyle: 'dashed',
    borderRadius: 10,
    padding: 14,
    backgroundColor: C.primary + '06',
  },
  attachBtnIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: C.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachBtnTitle: { fontSize: 14, fontWeight: '600', color: C.primary },
  attachBtnSub:   { fontSize: 11, color: C.textSecondary, marginTop: 2 },
  fileList:       { marginTop: 10, gap: 8 },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.background,
    borderRadius: 8,
    padding: 10,
    gap: 10,
  },
  fileItemIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: C.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileItemInfo:   { flex: 1 },
  fileItemName:   { fontSize: 13, fontWeight: '500', color: C.textPrimary },
  fileItemSize:   { fontSize: 11, color: C.textSecondary, marginTop: 1 },
  fileItemRemove: { padding: 3 },

  // Required note
  requiredNote: {
    fontSize: 12,
    color: C.textTertiary,
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 8,
  },

  // Type picker bottom sheet
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  pickerHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.border,
    marginTop: 10,
    marginBottom: 4,
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: C.textPrimary,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border + '60',
  },
  pickerOptionSelected:     { backgroundColor: C.primary + '08' },
  pickerOptionText:         { fontSize: 15, color: C.textPrimary, flex: 1, paddingRight: 10 },
  pickerOptionTextSelected: { color: C.primary, fontWeight: '600' },
});

export default CreateInvoice;