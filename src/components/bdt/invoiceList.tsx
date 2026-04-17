/**
 * bdt/invoiceList.tsx
 *
 * Lists every invoice created for a given lead.
 * Tapping a row opens the Invoice detail screen for that invoice.
 * The "+" button in the header starts the create flow (when canCreate=true).
 *
 * Mirrors the BUP InvoiceList component for visual/behavioural consistency.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StatusBar,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { BACKEND_URL } from '../../config/config';
import { ThemeColors } from './types';

// ─── Colour palette ────────────────────────────────────────────────────────
const C = {
  primary:       '#075E54',
  primaryLight:  '#128C7E',
  primaryDark:   '#054D44',
  secondary:     '#25D366',
  accent:        '#10B981',
  danger:        '#EF4444',
  warning:       '#F59E0B',
  background:    '#f0f0f0',
  surface:       '#FFFFFF',
  textPrimary:   '#1F2937',
  textSecondary: '#6B7280',
  textTertiary:  '#9CA3AF',
  border:        '#E5E7EB',
  success:       '#25D366',
  chatBg:        '#ECE5DD',
};

// ─── Types ─────────────────────────────────────────────────────────────────
export interface InvoiceFile {
  id: number;
  file: string;
  created_at: string;
  updated_at: string;
}

export interface InvoiceData {
  id: number;
  lead: any;
  type: string;
  other_type_description?: string;
  vendor_name: string;
  vendor_gst_or_pan: string;
  vendor_address?: string;
  terrace_rent?: string;
  billing_area: string;
  car_parking: string;
  property_type: string;
  particular_matter_to_mention: string;
  executive_name: string;
  created_at: string;
  updated_at: string;
  files?: InvoiceFile[];
}

interface InvoiceListProps {
  leadId: number;
  leadName: string;
  token: string | null;
  theme: ThemeColors;
  onBack: () => void;
  /** Called when the user taps a specific invoice row → parent shows detail */
  onSelectInvoice: (invoice: InvoiceData) => void;
  /** Called when the user taps "+" to create a new invoice */
  onCreateInvoice: () => void;
  /** Whether the "+" button should be shown */
  canCreate?: boolean;
}

// ─── Helpers ───────────────────────────────────────────────────────────────
const formatDateTime = (dateString: string): string => {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return '-';
  }
};

const TYPE_DISPLAY: Record<string, string> = {
  complete: 'Complete',
  partial:  'Partial',
  other:    'Other',
};

// ─── Component ─────────────────────────────────────────────────────────────
const InvoiceList: React.FC<InvoiceListProps> = ({
  leadId,
  leadName,
  token,
  theme,
  onBack,
  onSelectInvoice,
  onCreateInvoice,
  canCreate = false,
}) => {
  const [loading, setLoading]   = useState(true);
  const [invoices, setInvoices] = useState<InvoiceData[]>([]);

  const fetchInvoices = useCallback(async () => {
    if (!token) { onBack(); return; }
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/employee/getInvoice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, lead_id: leadId }),
      });

      if (!res.ok) {
        // 404 → no invoices yet; fine when canCreate === true
        setInvoices([]);
        setLoading(false);
        return;
      }

      const data = await res.json();
      setInvoices(data.invoices || []);
    } catch (err) {
      console.error('InvoiceList fetchInvoices error:', err);
      Alert.alert('Error', 'Failed to load invoices. Please try again.');
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  }, [token, leadId]);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  // ── Row ──────────────────────────────────────────────────────────────────
  const renderRow = ({ item, index }: { item: InvoiceData; index: number }) => {
    const typeLabel = TYPE_DISPLAY[item.type] ?? item.type ?? '';
    return (
      <TouchableOpacity
        style={s.row}
        activeOpacity={0.75}
        onPress={() => onSelectInvoice(item)}
      >
        <View style={s.rowIconWrap}>
          <MaterialIcons name="receipt-long" size={22} color={C.primary} />
        </View>
        <View style={s.rowBody}>
          {/* Sequential number from list position, not DB id */}
          <Text style={s.rowTitle} numberOfLines={1}>
            Invoice #{index + 1} — {item.vendor_name || 'Unknown Vendor'}
          </Text>
          <Text style={s.rowMeta} numberOfLines={1}>
            {typeLabel}  ·  {item.property_type}  ·  {item.billing_area}
          </Text>
          <Text style={s.rowDate}>{formatDateTime(item.created_at)}</Text>
        </View>
        <View style={s.rowChevron}>
          <Ionicons name="chevron-forward" size={18} color={C.textTertiary} />
        </View>
      </TouchableOpacity>
    );
  };

  // ── Empty state ───────────────────────────────────────────────────────────
  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={s.emptyWrap}>
        <MaterialIcons name="receipt-long" size={56} color={C.textTertiary} />
        <Text style={s.emptyTitle}>Once created you are not authorized to see the invoice</Text>
        <Text style={s.emptyText}>
          {canCreate
            ? 'Tap the "+" button above to raise a new invoice for this lead.'
            : 'No invoice has been raised for this lead.'}
        </Text>
      </View>
    );
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.primary} />

      {/* ── Header ── */}
      <SafeAreaView style={s.headerSafe} edges={['top']}>
        <View style={s.header}>
          <TouchableOpacity onPress={onBack} style={s.backBtn}>
            <View style={s.backArrowWrap}>
              <View style={s.backArrow} />
            </View>
          </TouchableOpacity>

          <View style={s.headerCenter}>
            <Text style={s.headerTitle} numberOfLines={1}>Invoices</Text>
            <Text style={s.headerSub} numberOfLines={1}>{leadName}</Text>
          </View>

          {canCreate ? (
            <TouchableOpacity style={s.addBtn} onPress={onCreateInvoice}>
              <Ionicons name="add" size={24} color="#FFF" />
            </TouchableOpacity>
          ) : (
            <View style={s.headerPlaceholder} />
          )}
        </View>
      </SafeAreaView>

      {/* ── List ── */}
      {loading ? (
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={s.loadingText}>Loading invoices…</Text>
        </View>
      ) : (
        <FlatList
          data={invoices}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderRow}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={[
            s.listContent,
            invoices.length === 0 && s.listContentFlex,
          ]}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={s.separator} />}
          ListHeaderComponent={
            invoices.length > 0 ? (
              <Text style={s.listCount}>
                {invoices.length} invoice{invoices.length !== 1 ? 's' : ''}
              </Text>
            ) : null
          }
        />
      )}
    </View>
  );
};

// ─── Styles ────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },

  // Header
  headerSafe: { backgroundColor: C.primary },
  header: {
    backgroundColor: C.primary,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.primaryDark,
  },
  backBtn:       { padding: 6, marginRight: 4 },
  backArrowWrap: { height: 24, alignItems: 'center', justifyContent: 'center' },
  backArrow: {
    width: 12, height: 12,
    borderLeftWidth: 2, borderTopWidth: 2,
    borderColor: '#fff',
    transform: [{ rotate: '-45deg' }],
  },
  headerCenter: { flex: 1, marginLeft: 8 },
  headerTitle:  { fontSize: 17, fontWeight: '600', color: '#FFF' },
  headerSub:    { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 1 },
  addBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerPlaceholder: { width: 36 },

  // Loading
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 15, color: C.textSecondary },

  // List
  listContent:     { padding: 12, paddingBottom: 24 },
  listContentFlex: { flexGrow: 1 },
  listCount: {
    fontSize: 12, fontWeight: '600', color: C.textSecondary,
    marginBottom: 10, letterSpacing: 0.5, textTransform: 'uppercase',
  },

  // Row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderRadius: 10,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  rowIconWrap: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: C.primary + '15',
    alignItems: 'center', justifyContent: 'center',
    marginRight: 12,
  },
  rowBody:    { flex: 1 },
  rowTitle:   { fontSize: 14, fontWeight: '600', color: C.textPrimary, marginBottom: 2 },
  rowMeta:    { fontSize: 12, color: C.textSecondary, marginBottom: 2 },
  rowDate:    { fontSize: 11, color: C.textTertiary },
  rowChevron: { paddingLeft: 8 },
  separator:  { height: 8 },

  // Empty
  emptyWrap: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 40, gap: 12,
  },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: C.textPrimary },
  emptyText:  { fontSize: 13, color: C.textSecondary, textAlign: 'center', lineHeight: 20 },
});

export default InvoiceList;