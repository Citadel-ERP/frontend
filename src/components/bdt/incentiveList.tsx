/**
 * bdt/incentiveList.tsx
 *
 * Lists every incentive created for a given lead.
 * Tapping a row opens the Incentive management screen for that incentive_id.
 * The "+" button starts the create flow (when canCreate=true).
 *
 * Mirrors the BUP IncentiveList component for visual consistency.
 * Row titles show "Incentive #1", "#2", etc. based on list position (oldest=1).
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
  background:    '#f0f0f0',
  surface:       '#FFFFFF',
  textPrimary:   '#1F2937',
  textSecondary: '#6B7280',
  textTertiary:  '#9CA3AF',
  border:        '#E5E7EB',
  success:       '#25D366',
  warning:       '#F59E0B',
  info:          '#3B82F6',
};

// ─── Status helpers ────────────────────────────────────────────────────────
const STATUS_LABEL: Record<string, string> = {
  pending:              'Pending',
  correction:           'Correction',
  accepted_by_bdt:      'Accepted by BDT',
  accepted:             'Accepted',
  payment_confirmation: 'Payment Processing',
  completed:            'Completed',
};

const STATUS_COLOR: Record<string, string> = {
  pending:              C.warning,
  correction:           '#FF9500',
  accepted_by_bdt:      C.info,
  accepted:             C.success,
  payment_confirmation: '#5856D6',
  completed:            C.success,
};

// ─── Types ─────────────────────────────────────────────────────────────────
export interface IncentiveSummary {
  id: number;
  gross_income_recieved: number;
  net_company_earning: number | null;
  intercity_deals: boolean;
  status: string;
  created_at: string;
  updated_at: string;
  city?: string;
  /** Per-user status for the requesting BDT user */
  my_share?: {
    user_status: string;
    bdt_share: number | null;
    final_amount_payable: number | null;
  } | null;
}

interface IncentiveListProps {
  leadId: number;
  leadName: string;
  token: string | null;
  theme: ThemeColors;
  onBack: () => void;
  /** Callback with selected incentive_id → parent opens Incentive detail */
  onSelectIncentive: (incentiveId: number) => void;
  /** Callback to open the create-incentive flow */
  onCreateIncentive: () => void;
  /** Whether the "+" button should be shown */
  canCreate?: boolean;
}

// ─── Helpers ───────────────────────────────────────────────────────────────
const fmtCurrency = (v: number | null | undefined) => {
  if (v == null) return '₹—';
  return `₹${v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const fmtDate = (s: string) => {
  try {
    const d = new Date(s);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return s;
  }
};

// ─── Component ─────────────────────────────────────────────────────────────
const IncentiveList: React.FC<IncentiveListProps> = ({
  leadId,
  leadName,
  token,
  theme,
  onBack,
  onSelectIncentive,
  onCreateIncentive,
  canCreate = false,
}) => {
  const [loading, setLoading]       = useState(true);
  const [incentives, setIncentives] = useState<IncentiveSummary[]>([]);

  const fetchIncentives = useCallback(async () => {
    if (!token) { onBack(); return; }
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/employee/getIncentive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, lead_id: leadId }),
      });

      if (!res.ok) {
        // No incentives yet
        setIncentives([]);
        setLoading(false);
        return;
      }

      const data = await res.json();
      // Backend may return { incentive: {} } (single) or { incentives: [] } (list)
      // The list endpoint returns { incentives: [...] }
      if (data.incentives) {
        setIncentives(data.incentives);
      } else if (data.incentive) {
        // Wrap single in array for backwards compat
        setIncentives([data.incentive]);
      } else {
        setIncentives([]);
      }
    } catch (err) {
      console.error('IncentiveList fetch error:', err);
      Alert.alert('Error', 'Failed to load incentives. Please try again.');
      setIncentives([]);
    } finally {
      setLoading(false);
    }
  }, [token, leadId]);

  useEffect(() => { fetchIncentives(); }, [fetchIncentives]);

  // ── Row ──────────────────────────────────────────────────────────────────
  const renderRow = ({ item, index }: { item: IncentiveSummary; index: number }) => {
    // Use my_share.user_status for colour if available, else fall back to top-level status
    const displayStatus = item.my_share?.user_status ?? item.status;
    const statusColor   = STATUS_COLOR[displayStatus] ?? C.textSecondary;
    const statusLabel   = STATUS_LABEL[displayStatus] ?? displayStatus;

    // Human-friendly numbering: oldest = #1
    const incentiveNumber = index + 1;

    return (
      <TouchableOpacity
        style={s.row}
        activeOpacity={0.75}
        onPress={() => onSelectIncentive(item.id)}
      >
        {/* Left accent bar */}
        <View style={[s.rowAccent, { backgroundColor: statusColor }]} />

        <View style={s.rowContent}>
          {/* Top line: number label + status pill */}
          <View style={s.rowTopLine}>
            <Text style={s.rowTitle}>Incentive #{incentiveNumber}</Text>
            <View style={[s.statusPill, { backgroundColor: statusColor + '20', borderColor: statusColor }]}>
              <Text style={[s.statusPillText, { color: statusColor }]}>{statusLabel}</Text>
            </View>
          </View>

          {/* Amounts */}
          <View style={s.rowAmounts}>
            <View style={s.amountCell}>
              <Text style={s.amountLabel}>Gross Income</Text>
              <Text style={s.amountValue}>{fmtCurrency(item.gross_income_recieved)}</Text>
            </View>
            <View style={s.amountCell}>
              <Text style={s.amountLabel}>Net Earning</Text>
              <Text style={s.amountValue}>{fmtCurrency(item.net_company_earning)}</Text>
            </View>
            {item.my_share?.final_amount_payable != null && (
              <View style={s.amountCell}>
                <Text style={s.amountLabel}>Your Share</Text>
                <Text style={[s.amountValue, { color: C.success }]}>
                  {fmtCurrency(item.my_share.final_amount_payable)}
                </Text>
              </View>
            )}
            {item.intercity_deals && (
              <View style={s.intercityBadge}>
                <Text style={s.intercityText}>Intercity</Text>
              </View>
            )}
          </View>

          {/* Footer: date + city */}
          <View style={s.rowFooter}>
            <Ionicons name="calendar-outline" size={12} color={C.textTertiary} />
            <Text style={s.rowDate}>{fmtDate(item.created_at)}</Text>
            {item.city ? (
              <>
                <Text style={s.rowSep}>·</Text>
                <Ionicons name="location-outline" size={12} color={C.textTertiary} />
                <Text style={s.rowDate}>{item.city}</Text>
              </>
            ) : null}
          </View>
        </View>

        <Ionicons name="chevron-forward" size={18} color={C.textTertiary} style={{ marginLeft: 4 }} />
      </TouchableOpacity>
    );
  };

  // ── Empty state ───────────────────────────────────────────────────────────
  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={s.emptyWrap}>
        <MaterialIcons name="monetization-on" size={56} color={C.textTertiary} />
        <Text style={s.emptyTitle}>No Incentives Yet</Text>
        <Text style={s.emptyText}>
          {canCreate
            ? 'Tap the "+" button above to create the first incentive for this lead.'
            : 'No incentive has been created for this lead.'}
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
            <Text style={s.headerTitle} numberOfLines={1}>Incentives</Text>
            <Text style={s.headerSub} numberOfLines={1}>{leadName}</Text>
          </View>

          {canCreate ? (
            <TouchableOpacity style={s.addBtn} onPress={onCreateIncentive}>
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
          <Text style={s.loadingText}>Loading incentives…</Text>
        </View>
      ) : (
        <FlatList
          data={incentives}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderRow}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={[
            s.listContent,
            incentives.length === 0 && s.listContentFlex,
          ]}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={s.separator} />}
          ListHeaderComponent={
            incentives.length > 0 ? (
              <Text style={s.listCount}>
                {incentives.length} incentive{incentives.length !== 1 ? 's' : ''}
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
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    paddingRight: 14,
    paddingVertical: 14,
  },
  rowAccent:  { width: 4, alignSelf: 'stretch', marginRight: 12 },
  rowContent: { flex: 1 },
  rowTopLine: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 8,
  },
  rowTitle: { fontSize: 14, fontWeight: '600', color: C.textPrimary },
  statusPill: {
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 6, borderWidth: 1,
  },
  statusPillText: { fontSize: 10, fontWeight: '700' },

  rowAmounts: {
    flexDirection: 'row', alignItems: 'center',
    marginBottom: 8, gap: 16, flexWrap: 'wrap',
  },
  amountCell:  {},
  amountLabel: { fontSize: 10, color: C.textSecondary, marginBottom: 2 },
  amountValue: { fontSize: 13, fontWeight: '600', color: C.textPrimary },

  intercityBadge: {
    backgroundColor: C.info + '15',
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 6, borderWidth: 1, borderColor: C.info + '40',
  },
  intercityText: { fontSize: 10, fontWeight: '600', color: C.info },

  rowFooter: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rowDate:   { fontSize: 11, color: C.textTertiary },
  rowSep:    { fontSize: 11, color: C.textTertiary },

  separator: { height: 8 },

  // Empty
  emptyWrap: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 40, gap: 12,
  },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: C.textPrimary },
  emptyText:  { fontSize: 13, color: C.textSecondary, textAlign: 'center', lineHeight: 20 },
});

export default IncentiveList;