// bup/incentive.tsx
// Changes:
//   1. Transaction details (referral, bd_expenses, goodwill) are editable when
//      incentive.status === 'pending'. For every other status they are read-only.
//   2. Participant-share section is ALWAYS rendered. When the BDT created the
//      incentive without explicit participant_shares the backend now seeds every
//      participant with 0-value records (see backend diff), so the cards always
//      appear. SingleUserUpdateForm pre-fills only non-zero values to avoid
//      misleading zero-primed inputs.
//   3. The bulk-edit toggle (showBulkEdit) and its associated updateIncentive()
//      function have been removed. Per-participant editing is handled exclusively
//      through the "Update This Share" inline form, which is cleaner and safer.
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  StatusBar, Alert, TextInput, ActivityIndicator, Platform,
} from 'react-native';
import { colors, spacing, fontSize, borderRadius, shadows } from './theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BACKEND_URL } from '../../config/config';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemeColors } from './types';

const TOKEN_KEY = 'token_2';

// ─── Types ────────────────────────────────────────────────────────────────

interface UserMinimal {
  employee_id: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  role: string;
  profile_picture: string | null;
  designation: string | null;
}

interface Remark {
  remark: string;
  user_id: number | null;
  username: string;
  created_at: string;
  auto?: boolean;
}

interface CollaboratorShare {
  id: number;
  user: UserMinimal;
  is_assigned_user: boolean;
  bdt_share_percentage: number | null;
  tds_percentage: number | null;
  bdt_share: number | null;
  tds_deducted: number | null;
  final_amount_payable: number | null;
}

interface ParticipantShareStatus {
  user_id: number;
  user_name: string;
  employee_id: string;
  user_status: UserStatus;
  bdt_share: number | null;
  tds_deducted: number | null;
  final_amount_payable: number | null;
  tds_percentage: number | null;
  payment_confirmed_by_bdt: boolean;
  payment_sent_by_bup: boolean;
  is_assigned_user: boolean;
}

type UserStatus =
  | 'pending'
  | 'correction'
  | 'accepted_by_bdt'
  | 'accepted'
  | 'payment_confirmation'
  | 'completed';

interface IncentiveData {
  id: number;
  bdt: UserMinimal;
  created_at: string;
  updated_at: string;
  gross_income_recieved: number;
  intercity_deals: boolean;
  intercity_amount: number | null;
  referral_amt: number;
  bdt_expenses: number;
  goodwill: number;
  staff_incentive: number | null;
  tds_deducted: number | null;
  net_company_earning: number | null;
  bdt_share: number | null;
  less_tax: number | null;
  final_amount_payable: number | null;
  status: string;
  remarks: Remark[];
  city?: string;
  collaborator_shares: CollaboratorShare[];
  participant_share_statuses?: ParticipantShareStatus[];
}

interface Participant {
  user: UserMinimal;
  is_assigned_user: boolean;
  user_id: number;
}

interface ParticipantShareInput {
  user_id: number;
  user: UserMinimal;
  is_assigned_user: boolean;
  bdt_share_percentage: string;
  tds_percentage: string;
}

interface IncentiveProps {
  onBack: () => void;
  leadId: number;
  leadName: string;
  hideHeader?: boolean;
  theme: ThemeColors;
  canCreate?: boolean;
  onIncentiveCreated?: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────

const EXPENSE_OPTIONS = [
  { label: 'Referral',    key: 'referral'    },
  { label: 'BD Expenses', key: 'bd_expenses' },
  { label: 'Goodwill',    key: 'goodwill'    },
];

const INTERCITY_CITIES = [
  'Bangalore', 'Chennai', 'Hyderabad', 'Mumbai', 'NCR', 'Pune', 'Other',
];

// ─── Helpers ──────────────────────────────────────────────────────────────

const fmt = (value: string): string => {
  const number = value.replace(/[^0-9.]/g, '');
  const parts = number.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.');
};

const parse = (value: string): string => value.replace(/,/g, '');

const fmtCurrency = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined) return '₹—';
  return `₹${amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const fmtDate = (s: string): string =>
  new Date(s).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

const calcParticipantAmounts = (baseAmount: number, pct: string, tdsPct: string) => {
  const shareAmt = (baseAmount * (parseFloat(pct) || 0)) / 100;
  const tdsAmt   = (shareAmt * (parseFloat(tdsPct) || 0)) / 100;
  return { shareAmt, tdsAmt, final: shareAmt - tdsAmt };
};

const userStatusColor = (s: UserStatus): string => ({
  pending:              colors.warning,
  correction:           '#FF9500',
  accepted_by_bdt:      colors.info,
  accepted:             colors.success,
  payment_confirmation: '#5856D6',
  completed:            colors.success,
}[s] ?? colors.textSecondary);

const userStatusLabel = (s: UserStatus): string => ({
  pending:              '⏳ Pending Review',
  correction:           '✏️ Awaiting Correction',
  accepted_by_bdt:      '✅ Accepted by BDT',
  accepted:             '✅ Accepted by BUP',
  payment_confirmation: '💳 Payment Processing',
  completed:            '🎉 Completed',
}[s] ?? s);

// ─── ParticipantShareRow (create / create-review flow) ────────────────────

interface ParticipantShareRowProps {
  inp: ParticipantShareInput;
  index: number;
  baseAmount: number;
  isEdit: boolean;
  onChangeSharePct: (index: number, value: string, isEdit: boolean) => void;
  onChangeTdsPct: (index: number, value: string, isEdit: boolean) => void;
}

const ParticipantShareRow: React.FC<ParticipantShareRowProps> = ({
  inp, index, baseAmount, isEdit, onChangeSharePct, onChangeTdsPct,
}) => {
  const { shareAmt, tdsAmt, final } = calcParticipantAmounts(
    baseAmount, inp.bdt_share_percentage, inp.tds_percentage
  );
  const hasPreview = !!inp.bdt_share_percentage && parseFloat(inp.bdt_share_percentage) > 0;

  return (
    <View style={styles.participantRow}>
      <View style={styles.participantHeader}>
        <View style={styles.participantAvatar}>
          <Text style={styles.participantAvatarText}>
            {(inp.user.first_name?.[0] ?? '?').toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.participantName}>{inp.user.full_name}</Text>
          <Text style={styles.participantRole}>
            {inp.is_assigned_user ? '👤 Assigned Transaction Team' : '🤝 Collaborator'}
          </Text>
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Transaction Share % *</Text>
        <TextInput
          style={styles.input}
          value={inp.bdt_share_percentage}
          onChangeText={v => onChangeSharePct(index, v.replace(/[^0-9.]/g, ''), isEdit)}
          placeholder="e.g. 60"
          keyboardType="numeric"
          placeholderTextColor={colors.textSecondary}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>TDS % *</Text>
        <TextInput
          style={styles.input}
          value={inp.tds_percentage}
          onChangeText={v => onChangeTdsPct(index, v.replace(/[^0-9.]/g, ''), isEdit)}
          placeholder="e.g. 10"
          keyboardType="numeric"
          placeholderTextColor={colors.textSecondary}
        />
      </View>

      {hasPreview && (
        <View style={styles.calculationPreview}>
          <View style={styles.calculationRow}>
            <Text style={styles.calculationLabel}>Share ({inp.bdt_share_percentage}%)</Text>
            <Text style={styles.calculationValue}>{fmtCurrency(shareAmt)}</Text>
          </View>
          <View style={styles.calculationRow}>
            <Text style={styles.calculationLabel}>Less TDS ({inp.tds_percentage || '0'}%)</Text>
            <Text style={[styles.calculationValue, styles.negativeValue]}>− {fmtCurrency(tdsAmt)}</Text>
          </View>
          <View style={[styles.calculationRow, styles.finalRow]}>
            <Text style={styles.finalLabel}>Net Payable</Text>
            <Text style={styles.finalValue}>{fmtCurrency(final)}</Text>
          </View>
        </View>
      )}
    </View>
  );
};

// ─── ParticipantStatusCard ─────────────────────────────────────────────────

interface ParticipantStatusCardProps {
  share: ParticipantShareStatus;
  onAccept: (userId: number, userName: string) => void;
  onSendForPayment: (userId: number, userName: string) => void;
  onUpdateSingle: (userId: number) => void;
  submitting: boolean;
}

const ParticipantStatusCard: React.FC<ParticipantStatusCardProps> = ({
  share, onAccept, onSendForPayment, onUpdateSingle, submitting,
}) => {
  const statusCol = userStatusColor(share.user_status);
  const statusLbl = userStatusLabel(share.user_status);

  // Determine if shares have been meaningfully set (non-zero)
  const hasShareSet =
    share.bdt_share !== null &&
    share.bdt_share !== undefined &&
    share.bdt_share > 0;

  return (
    <View style={styles.participantStatusCard}>
      {/* Header */}
      <View style={styles.participantStatusHeader}>
        <View style={styles.participantAvatarSmall}>
          <Text style={styles.participantAvatarText}>
            {(share.user_name?.[0] ?? '?').toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.participantName}>{share.user_name}</Text>
          <Text style={styles.participantRole}>
            {share.is_assigned_user ? '👤 Assigned Transaction Team' : '🤝 Collaborator'}
          </Text>
        </View>
        <View style={[styles.statusPill, { backgroundColor: statusCol + '20', borderColor: statusCol }]}>
          <Text style={[styles.statusPillText, { color: statusCol }]}>{statusLbl}</Text>
        </View>
      </View>

      {/* Amounts: always show the grid. When not yet set, show a hint. */}
      {hasShareSet ? (
        <View style={styles.amountGrid}>
          <View style={styles.amountCell}>
            <Text style={styles.amountLabel}>Share</Text>
            <Text style={styles.amountValue}>{fmtCurrency(share.bdt_share)}</Text>
          </View>
          <View style={styles.amountCell}>
            <Text style={styles.amountLabel}>
              TDS{share.tds_percentage != null && share.tds_percentage > 0
                ? ` (${share.tds_percentage}%)`
                : ''}
            </Text>
            <Text style={[styles.amountValue, { color: colors.error }]}>{fmtCurrency(share.tds_deducted)}</Text>
          </View>
          <View style={styles.amountCell}>
            <Text style={styles.amountLabel}>Net Payable</Text>
            <Text style={[styles.amountValue, { color: colors.success, fontWeight: '700' }]}>
              {fmtCurrency(share.final_amount_payable)}
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.notSetBanner}>
          <Text style={styles.notSetBannerText}>
            📋 Share not yet configured — use "Update This Share" below
          </Text>
        </View>
      )}

      {/* Payment flags */}
      <View style={styles.flagRow}>
        <View style={[
          styles.flagBadge,
          { backgroundColor: share.payment_sent_by_bup ? colors.success + '20' : colors.textSecondary + '15' },
        ]}>
          <Text style={[styles.flagText, { color: share.payment_sent_by_bup ? colors.success : colors.textSecondary }]}>
            {share.payment_sent_by_bup ? '✓ Payment Sent' : '○ Payment Not Sent'}
          </Text>
        </View>
        <View style={[
          styles.flagBadge,
          { backgroundColor: share.payment_confirmed_by_bdt ? colors.success + '20' : colors.textSecondary + '15' },
        ]}>
          <Text style={[styles.flagText, { color: share.payment_confirmed_by_bdt ? colors.success : colors.textSecondary }]}>
            {share.payment_confirmed_by_bdt ? '✓ BDT Confirmed' : '○ Awaiting BDT'}
          </Text>
        </View>
      </View>

      {/* Contextual action buttons */}
      <View style={styles.actionButtonRow}>
        {share.user_status === 'accepted_by_bdt' && (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.success }]}
            onPress={() => onAccept(share.user_id, share.user_name)}
            disabled={submitting}
          >
            {submitting
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.actionBtnText}>✓ Accept Share</Text>
            }
          </TouchableOpacity>
        )}

        {share.user_status === 'accepted' && (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#5856D6' }]}
            onPress={() => onSendForPayment(share.user_id, share.user_name)}
            disabled={submitting}
          >
            {submitting
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.actionBtnText}>💳 Send Payment</Text>
            }
          </TouchableOpacity>
        )}

        {(share.user_status === 'pending' || share.user_status === 'correction') && (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.info }]}
            onPress={() => onUpdateSingle(share.user_id)}
            disabled={submitting}
          >
            <Text style={styles.actionBtnText}>✏️ Update This Share</Text>
          </TouchableOpacity>
        )}

        {share.user_status === 'completed' && (
          <View style={[styles.actionBtn, { backgroundColor: colors.success + '30' }]}>
            <Text style={[styles.actionBtnText, { color: colors.success }]}>🎉 Fully Completed</Text>
          </View>
        )}

        {share.user_status === 'payment_confirmation' && (
          <View style={[styles.actionBtn, { backgroundColor: '#5856D6' + '20' }]}>
            <Text style={[styles.actionBtnText, { color: '#5856D6' }]}>⏳ Awaiting BDT Confirmation</Text>
          </View>
        )}
      </View>
    </View>
  );
};

// ─── SingleUserUpdateForm ─────────────────────────────────────────────────

interface SingleUserUpdateProps {
  share: ParticipantShareStatus;
  editBaseAmount: number;
  onSubmit: (userId: number, sharePercent: string, tdsPct: string) => void;
  onCancel: () => void;
  submitting: boolean;
}

const SingleUserUpdateForm: React.FC<SingleUserUpdateProps> = ({
  share, editBaseAmount, onSubmit, onCancel, submitting,
}) => {
  // Only pre-fill if a non-zero share was previously set, so a fresh participant
  // gets a blank field rather than a misleading "0.00".
  const [sharePct, setSharePct] = useState(() => {
    if (
      share.bdt_share !== null &&
      share.bdt_share !== undefined &&
      share.bdt_share > 0 &&
      editBaseAmount > 0
    ) {
      return String(((share.bdt_share / editBaseAmount) * 100).toFixed(2));
    }
    return '';
  });

  // Same guard for TDS — only pre-fill when a real value was stored.
  const [tdsPct, setTdsPct] = useState(() =>
    share.tds_percentage != null && share.tds_percentage > 0
      ? String(share.tds_percentage)
      : ''
  );

  const { shareAmt, tdsAmt, final } = calcParticipantAmounts(editBaseAmount, sharePct, tdsPct);
  const hasPreview = !!sharePct && parseFloat(sharePct) > 0;

  return (
    <View style={styles.singleUpdateContainer}>
      <View style={styles.singleUpdateHeader}>
        <View style={styles.participantAvatarSmall}>
          <Text style={styles.participantAvatarText}>
            {(share.user_name?.[0] ?? '?').toUpperCase()}
          </Text>
        </View>
        <Text style={styles.singleUpdateTitle}>Update Share: {share.user_name}</Text>
      </View>

      <Text style={styles.expenseInfoText}>
        Base amount: {fmtCurrency(editBaseAmount)}
      </Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Transaction Share %</Text>
        <TextInput
          style={styles.input}
          value={sharePct}
          onChangeText={v => setSharePct(v.replace(/[^0-9.]/g, ''))}
          placeholder="e.g. 60"
          keyboardType="numeric"
          placeholderTextColor={colors.textSecondary}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>TDS % (for {share.user_name} only)</Text>
        <TextInput
          style={styles.input}
          value={tdsPct}
          onChangeText={v => setTdsPct(v.replace(/[^0-9.]/g, ''))}
          placeholder="e.g. 10"
          keyboardType="numeric"
          placeholderTextColor={colors.textSecondary}
        />
        <Text style={[styles.expenseInfoText, { marginTop: 4, marginBottom: 0 }]}>
          ℹ️ This TDS applies only to {share.user_name}
        </Text>
      </View>

      {hasPreview && (
        <View style={styles.calculationPreview}>
          <View style={styles.calculationRow}>
            <Text style={styles.calculationLabel}>Share ({sharePct}%)</Text>
            <Text style={styles.calculationValue}>{fmtCurrency(shareAmt)}</Text>
          </View>
          <View style={styles.calculationRow}>
            <Text style={styles.calculationLabel}>Less TDS ({tdsPct || '0'}%)</Text>
            <Text style={[styles.calculationValue, styles.negativeValue]}>− {fmtCurrency(tdsAmt)}</Text>
          </View>
          <View style={[styles.calculationRow, styles.finalRow]}>
            <Text style={styles.finalLabel}>Net Payable</Text>
            <Text style={styles.finalValue}>{fmtCurrency(final)}</Text>
          </View>
        </View>
      )}

      <View style={styles.singleUpdateActions}>
        <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} disabled={submitting}>
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.primary, flex: 1 }]}
          onPress={() => onSubmit(share.user_id, sharePct, tdsPct)}
          disabled={submitting}
        >
          {submitting
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={styles.actionBtnText}>Update Share</Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────

const Incentive: React.FC<IncentiveProps> = ({
  onBack, leadId, leadName, hideHeader, theme,
  canCreate = false, onIncentiveCreated,
}) => {
  const [token, setToken]                 = useState<string | null>(null);
  const [loading, setLoading]             = useState(false);
  const [submitting, setSubmitting]       = useState(false);
  const [incentiveData, setIncentiveData] = useState<IncentiveData | null>(null);
  const [isCreateMode, setIsCreateMode]   = useState(false);
  const [showReview, setShowReview]       = useState(false);

  // Which user's inline form is open (null = none)
  const [singleUpdateUserId, setSingleUpdateUserId] = useState<number | null>(null);

  // ── Create-mode fields ────────────────────────────────────────────────
  const [grossIncome, setGrossIncome]           = useState('');
  const [selectedExpenses, setSelectedExpenses] = useState<Set<string>>(new Set());
  const [expenseValues, setExpenseValues]       = useState<{ [key: string]: string }>({
    referral: '', bd_expenses: '', goodwill: '',
  });
  const [intercityDeals, setIntercityDeals]     = useState('No');
  const [showIntercityDD, setShowIntercityDD]   = useState(false);
  const [selectedCity, setSelectedCity]         = useState('');
  const [showCityDD, setShowCityDD]             = useState(false);
  const [customCity, setCustomCity]             = useState('');
  const [participants, setParticipants]         = useState<Participant[]>([]);
  const [shareInputs, setShareInputs]           = useState<ParticipantShareInput[]>([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);

  // ── Editable expense fields for existing incentive ────────────────────
  // These are used both for the "pending → editable" transaction detail card
  // and as the base-amount source for SingleUserUpdateForm.
  const [editReferral, setEditReferral]     = useState('');
  const [editBdExpenses, setEditBdExpenses] = useState('');
  const [editGoodwill, setEditGoodwill]     = useState('');

  // ── Standalone remark ─────────────────────────────────────────────────
  const [remarkText, setRemarkText]       = useState('');
  const [addingRemark, setAddingRemark]   = useState(false);
  const [showRemarkBox, setShowRemarkBox] = useState(false);

  // ── Derived base amount (live-preview for SingleUserUpdateForm & edit card) ──
  const editBaseAmount = useMemo(() => {
    if (!incentiveData) return 0;
    const gross    = incentiveData.gross_income_recieved;
    const referral = parseFloat(parse(editReferral)) || 0;
    const bdExp    = parseFloat(parse(editBdExpenses)) || 0;
    const gw       = parseFloat(parse(editGoodwill)) || 0;
    const net      = gross - referral - bdExp - gw;
    return incentiveData.intercity_deals ? net * 0.5 : net;
  }, [incentiveData, editReferral, editBdExpenses, editGoodwill]);

  // ── Token ──────────────────────────────────────────────────────────────
  useEffect(() => {
    AsyncStorage.getItem(TOKEN_KEY)
      .then(t => setToken(t))
      .catch(e => console.error('token error', e));
  }, []);

  useEffect(() => {
    if (token) fetchIncentive();
  }, [token]);

  // ── Fetch incentive ────────────────────────────────────────────────────
  const fetchIncentive = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/manager/getIncentive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, lead_id: leadId }),
      });
      if (res.ok) {
        const data = await res.json();
        setIncentiveData(data.incentive);
        setIsCreateMode(false);
        syncEditExpenseFields(data.incentive);
      } else {
        if (canCreate) {
          setIsCreateMode(true);
          setIncentiveData(null);
          await fetchParticipants();
        } else {
          const err = await res.json().catch(() => ({}));
          Alert.alert('Error', err.message || 'Failed to fetch incentive');
          onBack();
        }
      }
    } catch (e) {
      console.error('fetchIncentive error', e);
      if (canCreate) {
        setIsCreateMode(true);
        setIncentiveData(null);
        await fetchParticipants();
      } else {
        Alert.alert('Error', 'Failed to fetch incentive data');
        onBack();
      }
    } finally {
      setLoading(false);
    }
  }, [token, leadId, canCreate]);

  // Sync the editable expense states from the latest incentive data.
  // Called whenever incentive data is (re-)fetched so inputs are always current.
  const syncEditExpenseFields = (incentive: IncentiveData) => {
    setEditReferral(incentive.referral_amt > 0 ? fmt(String(incentive.referral_amt)) : '');
    setEditBdExpenses(incentive.bdt_expenses > 0 ? fmt(String(incentive.bdt_expenses)) : '');
    setEditGoodwill(incentive.goodwill > 0 ? fmt(String(incentive.goodwill)) : '');
  };

  // ── Fetch participants (create mode only) ──────────────────────────────
  const fetchParticipants = useCallback(async () => {
    if (!token) return;
    setLoadingParticipants(true);
    try {
      const res = await fetch(`${BACKEND_URL}/manager/getLeadParticipants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, lead_id: leadId }),
      });
      if (res.ok) {
        const data = await res.json();
        const parts: Participant[] = data.participants || [];
        setParticipants(parts);
        setShareInputs(
          parts.map(p => ({
            user_id: p.user_id, user: p.user,
            is_assigned_user: p.is_assigned_user,
            bdt_share_percentage: '',
            tds_percentage: '',
          }))
        );
      }
    } catch (e) {
      console.error('fetchParticipants error', e);
    } finally {
      setLoadingParticipants(false);
    }
  }, [token, leadId]);

  // ── Share input helpers (create mode) ─────────────────────────────────
  const updateSharePct = useCallback((index: number, value: string, isEdit: boolean) => {
    setShareInputs(prev => {
      const next = [...prev];
      next[index] = { ...next[index], bdt_share_percentage: value };
      return next;
    });
  }, []);

  const updateTdsPct = useCallback((index: number, value: string, isEdit: boolean) => {
    setShareInputs(prev => {
      const next = [...prev];
      next[index] = { ...next[index], tds_percentage: value };
      return next;
    });
  }, []);

  const calcBaseAmount = (
    gross: number, referral: number, bdExp: number, gw: number, isIntercity: boolean
  ) => {
    const net = gross - referral - bdExp - gw;
    return { net, base: isIntercity ? net * 0.5 : net };
  };

  const validateShareInputs = (inputs: ParticipantShareInput[]): string | null => {
    if (inputs.length === 0) return null;
    for (const inp of inputs) {
      if (!inp.bdt_share_percentage || parseFloat(inp.bdt_share_percentage) <= 0) {
        return `Please enter Transaction Team Share % for ${inp.user.full_name}`;
      }
      if (inp.tds_percentage === '' || parseFloat(inp.tds_percentage) < 0) {
        return `Please enter a valid TDS % for ${inp.user.full_name}`;
      }
    }
    return null;
  };

  // ── Add standalone remark ──────────────────────────────────────────────
  const submitRemark = async () => {
    if (!token || !remarkText.trim()) {
      Alert.alert('Error', 'Please enter a remark');
      return;
    }
    setAddingRemark(true);
    try {
      const res = await fetch(`${BACKEND_URL}/manager/updateIncentive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, lead_id: leadId, remark: remarkText.trim() }),
      });
      if (!res.ok) throw new Error('Failed');
      await fetchIncentive();
      setRemarkText('');
      setShowRemarkBox(false);
    } catch {
      Alert.alert('Error', 'Failed to add remark. Please try again.');
    } finally {
      setAddingRemark(false);
    }
  };

  // ── Save transaction details (only when status === 'pending') ──────────
  // Sends updated expense fields to the backend WITHOUT participant_shares so
  // the backend keeps the existing incentive status and silently recalculates
  // share amounts based on stored percentages and the new base amount.
  const saveTransactionDetails = async () => {
    if (!token || !incentiveData) return;

    // Programmatic guard — defensive check independent of the UI flag.
    // The UI already hides this button for non-pending incentives, but this
    // ensures saveTransactionDetails() can never execute if somehow called
    // while the incentive is in any status other than 'pending'.
    if (incentiveData.status !== 'pending') {
      Alert.alert(
        'Not Allowed',
        `Transaction details can only be edited while the incentive is pending.\n\nCurrent status: "${incentiveData.status}".`
      );
      return;
    }

    const referral = parseFloat(parse(editReferral)) || 0;
    const bdExp    = parseFloat(parse(editBdExpenses)) || 0;
    const gw       = parseFloat(parse(editGoodwill)) || 0;
    const gross    = incentiveData.gross_income_recieved || 0;
    const net      = gross - referral - bdExp - gw;

    const payload: Record<string, unknown> = {
      token,
      lead_id: leadId,
      referral_amt:        referral,
      bdt_expenses:        bdExp,
      goodwill:            gw,
      net_company_earning: net,
    };

    // Update intercity_amount when applicable so the stored value stays in sync.
    if (incentiveData.intercity_deals) {
      payload.intercity_amount = net * 0.5;
    }

    // participant_shares is intentionally omitted → backend keeps status unchanged.

    setSubmitting(true);
    try {
      const res = await fetch(`${BACKEND_URL}/manager/updateIncentive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).message || 'Failed to update');
      }

      await fetchIncentive();
      Alert.alert('Success', 'Transaction details updated successfully!');
    } catch (e: any) {
      console.error('saveTransactionDetails error', e);
      Alert.alert('Error', e.message || 'Failed to update transaction details. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Create incentive ───────────────────────────────────────────────────
  const createIncentive = async () => {
    if (!token) return;
    if (!grossIncome) { Alert.alert('Error', 'Please enter gross income'); return; }
    for (const expense of selectedExpenses) {
      if (!expenseValues[expense]) {
        Alert.alert('Error', 'Please enter values for all selected expenses'); return;
      }
    }
    if (intercityDeals === 'Yes' && !selectedCity) {
      Alert.alert('Error', 'Please select a city for intercity deal'); return;
    }
    if (selectedCity === 'Other' && !customCity.trim()) {
      Alert.alert('Error', 'Please enter city name'); return;
    }
    const shareErr = validateShareInputs(shareInputs);
    if (shareErr) { Alert.alert('Error', shareErr); return; }

    const gross       = parseFloat(parse(grossIncome)) || 0;
    const referral    = parseFloat(parse(expenseValues.referral || '0')) || 0;
    const bdExp       = parseFloat(parse(expenseValues.bd_expenses || '0')) || 0;
    const gw          = parseFloat(parse(expenseValues.goodwill || '0')) || 0;
    const isIntercity = intercityDeals === 'Yes';
    const { net, base } = calcBaseAmount(gross, referral, bdExp, gw, isIntercity);

    const participantSharesPayload = shareInputs.map(inp => {
      const { shareAmt, tdsAmt, final } = calcParticipantAmounts(
        base, inp.bdt_share_percentage, inp.tds_percentage
      );
      return {
        user_id:              inp.user_id,
        bdt_share_percentage: parseFloat(inp.bdt_share_percentage),
        tds_percentage:       parseFloat(inp.tds_percentage) || 0,
        bdt_share:            shareAmt,
        tds_deducted:         tdsAmt,
        final_amount_payable: final,
      };
    });

    setSubmitting(true);
    try {
      const cityToSend = selectedCity === 'Other' ? customCity : selectedCity;
      const res = await fetch(`${BACKEND_URL}/manager/createIncentive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token, lead_id: leadId,
          gross_income_recieved: parse(grossIncome),
          referral_amt: referral, bdt_expenses: bdExp, goodwill: gw,
          intercity_deals: isIntercity,
          intercity_amount: isIntercity ? base : null,
          net_company_earning: net,
          city: isIntercity ? cityToSend : null,
          participant_shares: participantSharesPayload,
        }),
      });
      if (!res.ok) throw new Error('Failed to create incentive');
      const data = await res.json();
      setIncentiveData(data.incentive);
      setIsCreateMode(false);
      setShowReview(false);
      Alert.alert('Success', 'Incentive created successfully!');
      if (onIncentiveCreated) onIncentiveCreated();
    } catch (e) {
      console.error('createIncentive error', e);
      Alert.alert('Error', 'Failed to create incentive. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Update a single user's share ──────────────────────────────────────
  const updateSingleUserShare = async (userId: number, sharePct: string, tdsPct: string) => {
    if (!token || !incentiveData) return;

    if (!sharePct || parseFloat(sharePct) <= 0) {
      Alert.alert('Error', 'Please enter a valid share percentage'); return;
    }
    if (tdsPct === '' || parseFloat(tdsPct) < 0) {
      Alert.alert('Error', 'Please enter a valid TDS percentage'); return;
    }

    // ─── EXPENSE FIELDS INTENTIONALLY OMITTED ────────────────────────────
    // Expense editing (referral_amt / bdt_expenses / goodwill / net_company_earning
    // / intercity_amount) is ONLY permitted while incentive.status === 'pending',
    // and is handled exclusively by saveTransactionDetails().
    //
    // Including those fields here would silently overwrite expenses on any status
    // (accepted, correction, completed, etc.), defeating the pending-only gate.
    //
    // The backend computes the base amount from the already-stored expense values,
    // so nothing needs to be sent from the frontend here.
    // ─────────────────────────────────────────────────────────────────────

    setSubmitting(true);
    try {
      const res = await fetch(`${BACKEND_URL}/manager/updateIncentive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          lead_id: leadId,
          // Only share-specific fields — no expense fields
          participant_shares: [{
            user_id:              userId,
            bdt_share_percentage: parseFloat(sharePct),
            tds_percentage:       parseFloat(tdsPct),
          }],
          target_user_id: userId,
        }),
      });
      if (!res.ok) throw new Error('Failed to update share');
      setSingleUpdateUserId(null);
      await fetchIncentive();
      Alert.alert('Success', 'Share updated! The participant will be notified to review.');
    } catch (e) {
      console.error('updateSingleUserShare error', e);
      Alert.alert('Error', 'Failed to update share. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Accept single user ─────────────────────────────────────────────────
  const acceptSingleUser = async (userId: number, userName: string) => {
    if (!token) return;
    Alert.alert('Accept Share', `Accept incentive share for ${userName}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Accept',
        onPress: async () => {
          setSubmitting(true);
          try {
            const res = await fetch(`${BACKEND_URL}/manager/acceptIncentive`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ token, lead_id: leadId, target_user_id: userId }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Failed');
            Alert.alert('Success', `Incentive share accepted for ${userName}!`);
            fetchIncentive();
          } catch (e: any) {
            Alert.alert('Error', e.message || 'Failed to accept incentive share.');
          } finally {
            setSubmitting(false);
          }
        },
      },
    ]);
  };

  // ── Accept all pending ────────────────────────────────────────────────
  const acceptAllPending = async () => {
    if (!token) return;
    const pendingShares = (incentiveData?.participant_share_statuses ?? [])
      .filter(s => s.user_status === 'accepted_by_bdt');
    if (pendingShares.length === 0) {
      Alert.alert('Info', 'No shares pending BUP acceptance right now.');
      return;
    }
    Alert.alert(
      'Accept All',
      `Accept incentive shares for all ${pendingShares.length} pending participant(s)?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept All',
          onPress: async () => {
            setSubmitting(true);
            try {
              const res = await fetch(`${BACKEND_URL}/manager/acceptIncentive`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, lead_id: leadId }),
              });
              const data = await res.json();
              if (!res.ok) throw new Error(data.message || 'Failed');
              Alert.alert('Success', `Accepted for: ${(data.accepted_for ?? []).join(', ')}`);
              fetchIncentive();
            } catch (e: any) {
              Alert.alert('Error', e.message || 'Failed to accept incentive shares.');
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  // ── Send payment single ───────────────────────────────────────────────
  const sendPaymentSingleUser = async (userId: number, userName: string) => {
    if (!token) return;
    Alert.alert('Send Payment', `Mark payment as sent for ${userName}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Send',
        onPress: async () => {
          setSubmitting(true);
          try {
            const res = await fetch(`${BACKEND_URL}/manager/sendIncentiveForPayment`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ token, lead_id: leadId, target_user_id: userId }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Failed');
            Alert.alert('Success', `Payment sent for ${userName}!`);
            fetchIncentive();
          } catch (e: any) {
            Alert.alert('Error', e.message || 'Failed to send payment.');
          } finally {
            setSubmitting(false);
          }
        },
      },
    ]);
  };

  // ── Send payment all ──────────────────────────────────────────────────
  const sendPaymentAll = async () => {
    if (!token) return;
    const acceptedShares = (incentiveData?.participant_share_statuses ?? [])
      .filter(s => s.user_status === 'accepted');
    if (acceptedShares.length === 0) {
      Alert.alert('Info', 'No accepted shares ready for payment.');
      return;
    }
    Alert.alert(
      'Send All Payments',
      `Send payment for all ${acceptedShares.length} accepted participant(s)?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send All',
          onPress: async () => {
            setSubmitting(true);
            try {
              const res = await fetch(`${BACKEND_URL}/manager/sendIncentiveForPayment`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, lead_id: leadId }),
              });
              const data = await res.json();
              if (!res.ok) throw new Error(data.message || 'Failed');
              Alert.alert('Success', `Payment sent for: ${(data.sent_for ?? []).join(', ')}`);
              fetchIncentive();
            } catch (e: any) {
              Alert.alert('Error', e.message || 'Failed to send payments.');
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  // ── Header components ──────────────────────────────────────────────────
  const GreenHeader = ({ tall = false }) => (
    <LinearGradient
      colors={['#075E54', '#075E54']}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
      style={[styles.greenHeader, tall && styles.greenHeaderTall]}
    >
      <View style={styles.greenHeaderContent} />
    </LinearGradient>
  );

  const GreenHeaderReviewAndConfirm = ({ tall = false }) => (
    <LinearGradient
      colors={['#075E54', '#075E54']}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
      style={[styles.greenHeaderReview, tall && styles.greenHeaderTall]}
    >
      <View style={styles.greenHeaderContent} />
    </LinearGradient>
  );

  const HeaderBar = ({ title, onBackPress }: { title: string; onBackPress: () => void }) => (
    <View style={[styles.header, styles.headerWithGreen]}>
      <TouchableOpacity style={styles.backButton} onPress={onBackPress}>
        <View style={styles.backIcon}>
          <View style={styles.backArrow} />
          <Text style={styles.backText}>Back</Text>
        </View>
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{title}</Text>
      <View style={styles.headerSpacer} />
    </View>
  );

  const HeaderBarManagement = ({ title, onBackPress }: { title: string; onBackPress: () => void }) => (
    <View style={[styles.headerManagement, styles.headerWithGreen]}>
      <TouchableOpacity style={styles.backButton} onPress={onBackPress}>
        <View style={styles.backIcon}>
          <View style={styles.backArrow} />
          <Text style={styles.backText}>Back</Text>
        </View>
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{title}</Text>
      <View style={styles.headerSpacer} />
    </View>
  );

  // ─── RENDER: Loading ───────────────────────────────────────────────────
  if (loading && !incentiveData && !isCreateMode) {
    return (
      <View style={styles.container}>
        {!hideHeader && (
          <>
            <StatusBar barStyle="light-content" backgroundColor="#075E54" />
            <GreenHeader />
            <HeaderBar title="Incentive Details" onBackPress={onBack} />
          </>
        )}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading incentive data…</Text>
        </View>
      </View>
    );
  }

  // ─── RENDER: Create — Review ───────────────────────────────────────────
  if (isCreateMode && canCreate && showReview) {
    const gross       = parseFloat(parse(grossIncome)) || 0;
    const referral    = parseFloat(parse(expenseValues.referral || '0')) || 0;
    const bdExp       = parseFloat(parse(expenseValues.bd_expenses || '0')) || 0;
    const gw          = parseFloat(parse(expenseValues.goodwill || '0')) || 0;
    const isIntercity = intercityDeals === 'Yes';
    const { net, base } = calcBaseAmount(gross, referral, bdExp, gw, isIntercity);

    return (
      <View style={styles.container}>
        {!hideHeader && (
          <>
            <StatusBar barStyle="light-content" backgroundColor="#075E54" />
            <GreenHeaderReviewAndConfirm />
            <HeaderBar title="Review & Confirm" onBackPress={() => setShowReview(false)} />
          </>
        )}
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.card}>
            <Text style={styles.reviewTitle}>Review Details</Text>
            <Text style={styles.leadName}>Lead: {leadName}</Text>
            <View style={styles.summaryGrid}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Gross Income</Text>
                <Text style={styles.summaryValue}>₹{gross.toLocaleString('en-IN')}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>
                  {isIntercity ? 'Intercity Base (50%)' : 'Net Company Earning'}
                </Text>
                <Text style={styles.summaryValue}>₹{base.toLocaleString('en-IN')}</Text>
              </View>
            </View>
          </View>

          {shareInputs.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Per-Person Breakdown</Text>
              {shareInputs.map(inp => {
                const { shareAmt, tdsAmt, final } = calcParticipantAmounts(
                  base, inp.bdt_share_percentage, inp.tds_percentage
                );
                return (
                  <View key={inp.user_id} style={styles.reviewPersonRow}>
                    <Text style={styles.participantName}>{inp.user.full_name}</Text>
                    <Text style={styles.participantRole}>
                      {inp.is_assigned_user ? 'Assigned Transaction Team member' : 'Collaborator'}
                    </Text>
                    <View style={styles.calculationRow}>
                      <Text style={styles.calculationLabel}>Share ({inp.bdt_share_percentage}%)</Text>
                      <Text style={styles.calculationValue}>{fmtCurrency(shareAmt)}</Text>
                    </View>
                    <View style={styles.calculationRow}>
                      <Text style={styles.calculationLabel}>TDS ({inp.tds_percentage}%)</Text>
                      <Text style={[styles.calculationValue, styles.negativeValue]}>− {fmtCurrency(tdsAmt)}</Text>
                    </View>
                    <View style={[styles.calculationRow, styles.finalRow]}>
                      <Text style={styles.finalLabel}>Net Payable</Text>
                      <Text style={styles.finalValue}>{fmtCurrency(final)}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          <LinearGradient
            colors={['#075E54', '#075E54']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={[styles.submitButton, submitting && styles.submitButtonDisabled, { width: '90%', marginLeft: 20 }]}
          >
            <TouchableOpacity
              onPress={createIncentive} disabled={submitting}
              style={styles.submitButtonTouchable} activeOpacity={0.8}
            >
              {submitting
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.submitButtonText}>Confirm & Create Incentive</Text>
              }
            </TouchableOpacity>
          </LinearGradient>
          <View style={{ height: 100 }} />
        </ScrollView>
      </View>
    );
  }

  // ─── RENDER: Create — Form ─────────────────────────────────────────────
  if (isCreateMode && canCreate) {
    const gross       = parseFloat(parse(grossIncome)) || 0;
    const referral    = parseFloat(parse(expenseValues.referral || '0')) || 0;
    const bdExp       = parseFloat(parse(expenseValues.bd_expenses || '0')) || 0;
    const gw          = parseFloat(parse(expenseValues.goodwill || '0')) || 0;
    const isIntercity = intercityDeals === 'Yes';
    const { net, base } = calcBaseAmount(gross, referral, bdExp, gw, isIntercity);

    const handleContinue = () => {
      if (!grossIncome) { Alert.alert('Error', 'Please enter gross income'); return; }
      for (const k of selectedExpenses) {
        if (!expenseValues[k]) { Alert.alert('Error', 'Please enter values for all selected expenses'); return; }
      }
      if (isIntercity && !selectedCity) { Alert.alert('Error', 'Please select a city'); return; }
      if (selectedCity === 'Other' && !customCity.trim()) { Alert.alert('Error', 'Please enter city name'); return; }
      const shareErr = validateShareInputs(shareInputs);
      if (shareErr) { Alert.alert('Error', shareErr); return; }
      setShowReview(true);
    };

    return (
      <View style={styles.container}>
        {!hideHeader && (
          <>
            <StatusBar barStyle="light-content" backgroundColor="#075E54" />
            <GreenHeader tall />
            <HeaderBar title="Create Incentive" onBackPress={onBack} />
          </>
        )}
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Income Details</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Gross Income Received *</Text>
              <TextInput
                style={styles.input}
                value={grossIncome}
                onChangeText={v => setGrossIncome(fmt(v))}
                placeholder="e.g. 1,00,000"
                keyboardType="numeric"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Expenses (Optional)</Text>
            <Text style={styles.expenseInfoText}>Check the expenses that apply and enter their amounts</Text>
            {EXPENSE_OPTIONS.map(opt => (
              <View key={opt.key} style={styles.expenseItem}>
                <TouchableOpacity
                  style={styles.checkboxContainer}
                  onPress={() => {
                    const next = new Set(selectedExpenses);
                    if (next.has(opt.key)) {
                      next.delete(opt.key);
                      setExpenseValues(prev => ({ ...prev, [opt.key]: '' }));
                    } else {
                      next.add(opt.key);
                    }
                    setSelectedExpenses(next);
                  }}
                >
                  <View style={[styles.checkbox, selectedExpenses.has(opt.key) && styles.checkboxChecked]}>
                    {selectedExpenses.has(opt.key) && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <Text style={styles.expenseLabel}>{opt.label}</Text>
                </TouchableOpacity>
                {selectedExpenses.has(opt.key) && (
                  <TextInput
                    style={styles.expenseInput}
                    value={expenseValues[opt.key]}
                    onChangeText={v => setExpenseValues(prev => ({ ...prev, [opt.key]: fmt(v) }))}
                    placeholder="Enter amount"
                    keyboardType="numeric"
                    placeholderTextColor={colors.textSecondary}
                  />
                )}
              </View>
            ))}
          </View>

          <View style={styles.card}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Intercity Deal? *</Text>
              <TouchableOpacity style={styles.dropdown} onPress={() => setShowIntercityDD(prev => !prev)}>
                <Text style={styles.dropdownText}>{intercityDeals}</Text>
                <Text style={styles.dropdownArrow}>{showIntercityDD ? '▲' : '▼'}</Text>
              </TouchableOpacity>
              {showIntercityDD && (
                <View style={styles.dropdownMenu}>
                  {['Yes', 'No'].map(opt => (
                    <TouchableOpacity
                      key={opt} style={styles.dropdownItem}
                      onPress={() => {
                        setIntercityDeals(opt);
                        setShowIntercityDD(false);
                        if (opt === 'No') { setSelectedCity(''); setCustomCity(''); }
                      }}
                    >
                      <Text style={[styles.dropdownItemText, intercityDeals === opt && styles.selectedText]}>
                        {opt}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
            {intercityDeals === 'Yes' && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>City *</Text>
                <TouchableOpacity style={styles.dropdown} onPress={() => setShowCityDD(prev => !prev)}>
                  <Text style={styles.dropdownText}>{selectedCity || 'Select a city'}</Text>
                  <Text style={styles.dropdownArrow}>{showCityDD ? '▲' : '▼'}</Text>
                </TouchableOpacity>
                {showCityDD && (
                  <View style={styles.dropdownMenu}>
                    {INTERCITY_CITIES.map(city => (
                      <TouchableOpacity
                        key={city} style={styles.dropdownItem}
                        onPress={() => {
                          setSelectedCity(city);
                          setShowCityDD(false);
                          if (city !== 'Other') setCustomCity('');
                        }}
                      >
                        <Text style={[styles.dropdownItemText, selectedCity === city && styles.selectedText]}>
                          {city}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                {selectedCity === 'Other' && (
                  <TextInput
                    style={[styles.input, { marginTop: spacing.sm }]}
                    value={customCity}
                    onChangeText={setCustomCity}
                    placeholder="Enter city name"
                    placeholderTextColor={colors.textSecondary}
                  />
                )}
              </View>
            )}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Transaction Team Share Distribution</Text>
            <Text style={styles.expenseInfoText}>
              Set share % and TDS % individually for each participant.
              {base > 0 ? ` Base amount: ₹${base.toLocaleString('en-IN')}` : ''}
            </Text>
            {loadingParticipants ? (
              <ActivityIndicator color={colors.primary} style={{ marginTop: 16 }} />
            ) : shareInputs.length === 0 ? (
              <Text style={styles.expenseInfoText}>No participants found for this lead.</Text>
            ) : (
              shareInputs.map((inp, idx) => (
                <ParticipantShareRow
                  key={inp.user_id} inp={inp} index={idx}
                  baseAmount={base}
                  isEdit={false}
                  onChangeSharePct={updateSharePct}
                  onChangeTdsPct={updateTdsPct}
                />
              ))
            )}
          </View>

          <LinearGradient
            colors={['#075E54', '#075E54']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.continueButton}
          >
            <TouchableOpacity
              onPress={handleContinue}
              style={[styles.gradientTouchable, { alignItems: 'center', paddingTop: 5, paddingBottom: 5 }]}
              activeOpacity={0.8}
            >
              <Text style={styles.continueButtonText}>Continue to Review</Text>
            </TouchableOpacity>
          </LinearGradient>
          <View style={{ height: 100 }} />
        </ScrollView>
      </View>
    );
  }

  // ─── RENDER: No incentive (canCreate=false, nothing found) ────────────
  if (!incentiveData) {
    return (
      <View style={styles.container}>
        {!hideHeader && (
          <>
            <StatusBar barStyle="light-content" backgroundColor="#075E54" />
            <GreenHeader />
            <HeaderBar title="Incentive Details" onBackPress={onBack} />
          </>
        )}
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No incentive data found for this lead.</Text>
        </View>
      </View>
    );
  }

  // ─── RENDER: Main management view ─────────────────────────────────────
  const participantStatuses = incentiveData.participant_share_statuses ?? [];
  const totalParticipants   = participantStatuses.length;
  const completedCount      = participantStatuses.filter(s => s.user_status === 'completed').length;
  const pendingAcceptCount  = participantStatuses.filter(s => s.user_status === 'accepted_by_bdt').length;
  const readyForPayCount    = participantStatuses.filter(s => s.user_status === 'accepted').length;

  const singleUpdateShare = singleUpdateUserId
    ? participantStatuses.find(s => s.user_id === singleUpdateUserId) ?? null
    : null;

  // Incentive is editable (transaction details) only while in 'pending' status.
  const isTransactionDetailsEditable = incentiveData.status === 'pending';

  return (
    <View style={styles.container}>
      {!hideHeader && (
        <>
          <StatusBar barStyle="light-content" backgroundColor="#075E54" />
          <GreenHeader />
          <HeaderBarManagement title="Incentive Management" onBackPress={onBack} />
        </>
      )}

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>

        {/* ── Summary Header ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Lead: {leadName}</Text>

          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Participants</Text>
              <Text style={styles.summaryValue}>{totalParticipants}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Completed</Text>
              <Text style={[styles.summaryValue, { color: colors.success }]}>{completedCount}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Pending</Text>
              <Text style={[styles.summaryValue, { color: colors.info }]}>{pendingAcceptCount}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Ready to Pay</Text>
              <Text style={[styles.summaryValue, { color: '#5856D6' }]}>{readyForPayCount}</Text>
            </View>
          </View>

          <View style={styles.bulkActionRow}>
            {pendingAcceptCount > 0 && (
              <TouchableOpacity
                style={[styles.bulkBtn, { backgroundColor: colors.success }]}
                onPress={acceptAllPending}
                disabled={submitting}
              >
                <Text style={styles.bulkBtnText}>✓ Accept All ({pendingAcceptCount})</Text>
              </TouchableOpacity>
            )}
            {readyForPayCount > 0 && (
              <TouchableOpacity
                style={[styles.bulkBtn, { backgroundColor: '#5856D6' }]}
                onPress={sendPaymentAll}
                disabled={submitting}
              >
                <Text style={styles.bulkBtnText}>💳 Pay All ({readyForPayCount})</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Assigned To:</Text>
            <Text style={styles.infoValue}>{incentiveData.bdt.full_name}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Created:</Text>
            <Text style={styles.infoValue}>{fmtDate(incentiveData.created_at)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Last Updated:</Text>
            <Text style={styles.infoValue}>{fmtDate(incentiveData.updated_at)}</Text>
          </View>
        </View>

        {/* ── Transaction Details ── */}
        {/* Editable when status === 'pending'; read-only for all other statuses. */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle}>Transaction Details</Text>
            {isTransactionDetailsEditable && (
              <View style={styles.editableBadge}>
                <Text style={styles.editableBadgeText}>✏️ Editable</Text>
              </View>
            )}
          </View>

          {/* Gross Income — always read-only (fundamental figure set at creation) */}
          <View style={[styles.infoRow, styles.dividerRow]}>
            <Text style={styles.infoLabel}>Gross Income:</Text>
            <Text style={styles.infoValue}>{fmtCurrency(incentiveData.gross_income_recieved)}</Text>
          </View>

          {isTransactionDetailsEditable ? (
            /* ── Editable expense fields ── */
            <>
              <View style={[styles.inputGroup, { marginTop: spacing.sm }]}>
                <Text style={styles.label}>Referral Amount</Text>
                <TextInput
                  style={styles.input}
                  value={editReferral}
                  onChangeText={v => setEditReferral(fmt(v))}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>BD Expenses</Text>
                <TextInput
                  style={styles.input}
                  value={editBdExpenses}
                  onChangeText={v => setEditBdExpenses(fmt(v))}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Goodwill</Text>
                <TextInput
                  style={styles.input}
                  value={editGoodwill}
                  onChangeText={v => setEditGoodwill(fmt(v))}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              {/* Live preview of the base amount */}
              <View style={[styles.infoRow, styles.highlightRow, { marginBottom: spacing.sm }]}>
                <Text style={styles.calculationLabelBold}>
                  {incentiveData.intercity_deals ? 'Intercity Base (50%):' : 'Est. Net Earning:'}
                </Text>
                <Text style={styles.calculationValueBold}>{fmtCurrency(editBaseAmount)}</Text>
              </View>

              <LinearGradient
                colors={['#075E54', '#075E54']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
              >
                <TouchableOpacity
                  onPress={saveTransactionDetails}
                  disabled={submitting}
                  style={styles.submitButtonTouchable}
                  activeOpacity={0.8}
                >
                  {submitting
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={styles.submitButtonText}>Save Transaction Details</Text>
                  }
                </TouchableOpacity>
              </LinearGradient>
            </>
          ) : (
            /* ── Read-only expense rows ── */
            <>
              {incentiveData.referral_amt > 0 && (
                <View style={[styles.infoRow, styles.dividerRow]}>
                  <Text style={styles.infoLabel}>Referral Amount:</Text>
                  <Text style={styles.infoValue}>{fmtCurrency(incentiveData.referral_amt)}</Text>
                </View>
              )}
              {incentiveData.bdt_expenses > 0 && (
                <View style={[styles.infoRow, styles.dividerRow]}>
                  <Text style={styles.infoLabel}>BD Expenses:</Text>
                  <Text style={styles.infoValue}>{fmtCurrency(incentiveData.bdt_expenses)}</Text>
                </View>
              )}
              {incentiveData.goodwill > 0 && (
                <View style={[styles.infoRow, styles.dividerRow]}>
                  <Text style={styles.infoLabel}>Goodwill:</Text>
                  <Text style={styles.infoValue}>{fmtCurrency(incentiveData.goodwill)}</Text>
                </View>
              )}
              <View style={[styles.infoRow, styles.dividerRow]}>
                <Text style={styles.infoLabel}>Net Company Earning:</Text>
                <Text style={styles.infoValue}>{fmtCurrency(incentiveData.net_company_earning)}</Text>
              </View>
            </>
          )}

          {/* Deal Type & City — always read-only */}
          <View style={[styles.infoRow, styles.dividerRow]}>
            <Text style={styles.infoLabel}>Deal Type:</Text>
            <View style={incentiveData.intercity_deals ? styles.intercityBadgeYes : styles.intercityBadgeNo}>
              <Text style={incentiveData.intercity_deals ? styles.intercityTextYes : styles.intercityTextNo}>
                {incentiveData.intercity_deals ? 'Intercity' : 'Local'}
              </Text>
            </View>
          </View>
          {incentiveData.city && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>City:</Text>
              <Text style={styles.infoValue}>{incentiveData.city}</Text>
            </View>
          )}
          {incentiveData.intercity_deals && incentiveData.intercity_amount != null && !isTransactionDetailsEditable && (
            <View style={[styles.infoRow, styles.highlightRow]}>
              <Text style={styles.calculationLabelBold}>Intercity Share (50%):</Text>
              <Text style={styles.calculationValueBold}>{fmtCurrency(incentiveData.intercity_amount)}</Text>
            </View>
          )}
        </View>

        {/* ── Participant Status ── always rendered ── */}
        {/* Backend ensures every lead participant has a share record (even with 0 values),
            so this section will always display meaningful data. */}
        {participantStatuses.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Transaction Team Status ({totalParticipants})</Text>
            <Text style={styles.expenseInfoText}>
              Each participant's flow is independent. TDS % can differ per person.
            </Text>

            {/* Inline single-user update form */}
            {singleUpdateShare && (
              <SingleUserUpdateForm
                share={singleUpdateShare}
                editBaseAmount={editBaseAmount}
                onSubmit={updateSingleUserShare}
                onCancel={() => setSingleUpdateUserId(null)}
                submitting={submitting}
              />
            )}

            {/* Status cards — hide the one currently being edited */}
            {participantStatuses.map(share => {
              if (share.user_id === singleUpdateUserId) return null;
              return (
                <ParticipantStatusCard
                  key={share.user_id}
                  share={share}
                  onAccept={acceptSingleUser}
                  onSendForPayment={sendPaymentSingleUser}
                  onUpdateSingle={userId => setSingleUpdateUserId(userId)}
                  submitting={submitting}
                />
              );
            })}
          </View>
        )}

        {/* ── Add Remark ── */}
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.sectionToggleHeader}
            onPress={() => setShowRemarkBox(prev => !prev)}
          >
            <Text style={styles.cardTitle}>Add Remark</Text>
            <Text style={styles.dropdownArrow}>{showRemarkBox ? '▲' : '▼'}</Text>
          </TouchableOpacity>
          <Text style={styles.expenseInfoText}>
            Add a note visible to all participants at any time.
          </Text>
          {showRemarkBox && (
            <>
              <TextInput
                style={styles.remarkInput}
                value={remarkText}
                onChangeText={setRemarkText}
                placeholder="Type your remark here…"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                placeholderTextColor={colors.textSecondary}
              />
              <View style={styles.remarkSubmitRow}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => { setShowRemarkBox(false); setRemarkText(''); }}
                  disabled={addingRemark}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <LinearGradient
                  colors={['#075E54', '#075E54']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={[styles.remarkSubmitBtn, addingRemark && { opacity: 0.7 }]}
                >
                  <TouchableOpacity
                    onPress={submitRemark}
                    disabled={addingRemark}
                    style={{ alignItems: 'center', paddingVertical: spacing.sm, paddingHorizontal: spacing.lg }}
                  >
                    {addingRemark
                      ? <ActivityIndicator color="#fff" size="small" />
                      : <Text style={styles.submitButtonText}>Submit Remark</Text>
                    }
                  </TouchableOpacity>
                </LinearGradient>
              </View>
            </>
          )}
        </View>

        {/* ── Activity & Remarks ── */}
        {incentiveData.remarks?.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              Activity & Remarks ({incentiveData.remarks.length})
            </Text>
            {[...incentiveData.remarks].reverse().map((r, i) => (
              <View key={i} style={[styles.remarkItem, r.auto ? styles.remarkItemAuto : null]}>
                <View style={styles.remarkHeader}>
                  <Text style={styles.remarkAuthor}>
                    {r.auto ? '🔔 ' : ''}{r.username}
                  </Text>
                  <Text style={styles.remarkDate}>{fmtDate(r.created_at)}</Text>
                </View>
                <Text style={[styles.remarkText, r.auto && styles.remarkTextAuto]}>
                  {r.remark}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* ── All completed banner ── */}
        {completedCount === totalParticipants && totalParticipants > 0 && (
          <View style={styles.infoCard}>
            <Text style={styles.infoCardTitle}>🎉 All Completed</Text>
            <Text style={styles.infoCardText}>
              All participant incentives have been fully processed and confirmed.
            </Text>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.primary },
  scrollView: { flex: 1, backgroundColor: colors.backgroundSecondary },

  greenHeader: {
    paddingTop: 80, paddingBottom: 0, paddingHorizontal: 20,
    height: Platform.OS === 'ios' ? 130 : 80,
  },
  greenHeaderReview: {
    paddingTop: 80, paddingBottom: 0, paddingHorizontal: 20,
    height: Platform.OS === 'ios' ? 130 : 110,
  },
  greenHeaderTall: { height: Platform.OS === 'ios' ? 150 : 110 },
  greenHeaderContent: { marginTop: 0, paddingBottom: 30 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.lg, backgroundColor: colors.primary,
    marginTop: Platform.OS === 'ios' ? -10 : 0,
    paddingTop: Platform.OS === 'ios' ? 80 : 50,
    paddingBottom: 20,
  },
  headerManagement: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.lg, backgroundColor: colors.primary,
    marginTop: Platform.OS === 'ios' ? -10 : -30,
    paddingTop: Platform.OS === 'ios' ? 80 : 50,
    paddingBottom: 20,
  },
  headerWithGreen: {
    backgroundColor: 'transparent', position: 'absolute',
    top: 0, left: 0, right: 0, zIndex: 10, marginBottom: 20,
  },
  headerTitle: { fontWeight: '600', color: '#fff', flex: 1, textAlign: 'center', fontSize: 20 },
  headerSpacer: { width: 40 },
  backButton: { padding: spacing.sm, borderRadius: borderRadius.sm },
  backIcon: { height: 24, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
  backArrow: {
    width: 12, height: 12, borderLeftWidth: 2, borderTopWidth: 2,
    borderColor: '#fff', transform: [{ rotate: '-45deg' }],
  },
  backText: { color: '#fff', fontSize: 16, marginLeft: 2 },

  card: {
    backgroundColor: colors.white, marginHorizontal: spacing.lg,
    marginTop: spacing.lg, padding: spacing.lg,
    borderRadius: borderRadius.xl, ...shadows.md,
  },
  cardTitleRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: spacing.md,
  },
  cardTitle: { fontSize: fontSize.lg, fontWeight: '600', color: colors.text, marginBottom: spacing.md },
  editableBadge: {
    backgroundColor: colors.primary + '15',
    paddingHorizontal: spacing.sm, paddingVertical: 3,
    borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.primary,
    marginBottom: spacing.md,
  },
  editableBadgeText: { fontSize: 11, fontWeight: '600', color: colors.primary },

  reviewTitle: { fontSize: fontSize.xl, fontWeight: '700', color: colors.primary, marginBottom: spacing.xs },
  leadName: { fontSize: fontSize.md, color: colors.textSecondary, fontWeight: '500', marginBottom: spacing.md },

  inputGroup: { marginBottom: spacing.md },
  label: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text, marginBottom: spacing.sm },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    fontSize: fontSize.md, color: colors.text, backgroundColor: colors.white,
  },
  remarkInput: {
    borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.lg,
    padding: spacing.md, backgroundColor: colors.white,
    fontSize: fontSize.sm, color: colors.text, textAlignVertical: 'top', minHeight: 80,
    marginBottom: spacing.sm,
  },

  expenseInfoText: {
    fontSize: fontSize.sm, color: colors.textSecondary,
    marginBottom: spacing.md, fontStyle: 'italic',
  },
  expenseItem: {
    marginBottom: spacing.md, paddingBottom: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  checkboxContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  checkbox: {
    width: 20, height: 20, borderWidth: 2, borderColor: colors.border,
    borderRadius: borderRadius.sm, alignItems: 'center', justifyContent: 'center', marginRight: spacing.sm,
  },
  checkboxChecked: { borderColor: colors.primary, backgroundColor: colors.primary },
  checkmark: { color: '#fff', fontSize: fontSize.md, fontWeight: '700' },
  expenseLabel: { fontSize: fontSize.md, color: colors.text, fontWeight: '500' },
  expenseInput: {
    borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    fontSize: fontSize.md, color: colors.text,
    backgroundColor: colors.backgroundSecondary, marginTop: spacing.xs,
  },

  dropdown: {
    borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.white,
  },
  dropdownText: { fontSize: fontSize.md, color: colors.text, fontWeight: '500' },
  dropdownArrow: { fontSize: fontSize.sm, color: colors.textSecondary },
  dropdownMenu: {
    marginTop: spacing.xs, borderWidth: 1, borderColor: colors.border,
    borderRadius: borderRadius.lg, backgroundColor: colors.white, ...shadows.sm,
  },
  dropdownItem: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  dropdownItemText: { fontSize: fontSize.md, color: colors.text },
  selectedText: { color: colors.primary, fontWeight: '600' },

  summaryGrid: {
    flexDirection: 'row', justifyContent: 'space-between',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.lg, padding: spacing.md, marginBottom: spacing.md,
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryLabel: { fontSize: fontSize.xs, color: colors.textSecondary, marginBottom: spacing.xs, textAlign: 'center' },
  summaryValue: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },

  bulkActionRow: {
    flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md, flexWrap: 'wrap',
  },
  bulkBtn: {
    flex: 1, paddingVertical: spacing.sm, paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg, alignItems: 'center', minWidth: 120,
  },
  bulkBtnText: { color: '#fff', fontSize: fontSize.sm, fontWeight: '600' },

  participantStatusCard: {
    marginTop: spacing.md, paddingTop: spacing.md,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  participantStatusHeader: {
    flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm,
  },
  participantAvatarSmall: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center', marginRight: spacing.sm,
  },
  statusPill: {
    paddingHorizontal: spacing.sm, paddingVertical: 4,
    borderRadius: borderRadius.lg, borderWidth: 1, maxWidth: 150,
  },
  statusPillText: { fontSize: 10, fontWeight: '700' },

  amountGrid: {
    flexDirection: 'row', backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.lg, padding: spacing.sm, marginVertical: spacing.sm,
  },
  amountCell: { flex: 1, alignItems: 'center' },
  amountLabel: { fontSize: 10, color: colors.textSecondary, marginBottom: 2 },
  amountValue: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text },

  notSetBanner: {
    backgroundColor: colors.warning + '15',
    borderRadius: borderRadius.md, padding: spacing.sm,
    marginVertical: spacing.sm, borderWidth: 1, borderColor: colors.warning + '40',
  },
  notSetBannerText: { fontSize: fontSize.xs, color: colors.warning, fontWeight: '600' },

  flagRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm, flexWrap: 'wrap' },
  flagBadge: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: borderRadius.md },
  flagText: { fontSize: 10, fontWeight: '600' },

  actionButtonRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xs },
  actionBtn: {
    flex: 1, paddingVertical: spacing.sm, paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg, alignItems: 'center', minWidth: 120,
  },
  actionBtnText: { color: '#fff', fontSize: fontSize.sm, fontWeight: '600' },

  singleUpdateContainer: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.lg, padding: spacing.md,
    marginBottom: spacing.md, borderWidth: 1.5, borderColor: colors.info,
  },
  singleUpdateHeader: {
    flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm,
  },
  singleUpdateTitle: {
    fontSize: fontSize.md, fontWeight: '600', color: colors.primary,
    flex: 1, marginLeft: spacing.sm,
  },
  singleUpdateActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  cancelBtn: {
    paddingVertical: spacing.sm, paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center',
  },
  cancelBtnText: { color: colors.text, fontSize: fontSize.sm, fontWeight: '600' },

  sectionToggleHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: spacing.xs,
  },

  remarkSubmitRow: {
    flexDirection: 'row', gap: spacing.sm, alignItems: 'center', marginTop: spacing.xs,
  },
  remarkSubmitBtn: { flex: 1, borderRadius: borderRadius.lg },

  participantRow: {
    marginTop: spacing.md, paddingTop: spacing.md,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  participantHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  participantAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center', marginRight: spacing.sm,
  },
  participantAvatarText: { color: '#fff', fontSize: fontSize.md, fontWeight: '700' },
  participantName: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
  participantRole: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },

  calculationPreview: {
    backgroundColor: colors.backgroundSecondary,
    padding: spacing.md, borderRadius: borderRadius.lg, marginTop: spacing.sm,
  },
  calculationRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  calculationLabel: { fontSize: fontSize.sm, color: colors.textSecondary, flex: 1 },
  calculationValue: { fontSize: fontSize.sm, color: colors.text, fontWeight: '500' },
  calculationLabelBold: { fontSize: fontSize.sm, color: colors.text, fontWeight: '600', flex: 1 },
  calculationValueBold: { fontSize: fontSize.sm, color: colors.text, fontWeight: '700' },
  negativeValue: { color: colors.error },
  highlightRow: {
    backgroundColor: colors.info + '10',
    paddingHorizontal: spacing.sm, borderRadius: borderRadius.sm, marginVertical: spacing.xs,
  },
  finalRow: {
    backgroundColor: colors.success + '15',
    paddingHorizontal: spacing.sm, paddingVertical: spacing.md,
    borderRadius: borderRadius.lg, marginTop: spacing.sm,
    borderWidth: 2, borderColor: colors.success,
  },
  finalLabel: { fontSize: fontSize.md, color: colors.success, fontWeight: '700', flex: 1 },
  finalValue: { fontSize: fontSize.lg, color: colors.success, fontWeight: '700' },

  reviewPersonRow: {
    marginTop: spacing.md, paddingTop: spacing.md,
    borderTopWidth: 1, borderTopColor: colors.border,
  },

  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingVertical: spacing.xs,
  },
  dividerRow: { borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: spacing.sm },
  infoLabel: { fontSize: fontSize.sm, color: colors.textSecondary },
  infoValue: { fontSize: fontSize.sm, color: colors.text, fontWeight: '500' },

  intercityBadgeYes: {
    backgroundColor: colors.success + '20', paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md, borderRadius: borderRadius.md,
    borderWidth: 1, borderColor: colors.success,
  },
  intercityBadgeNo: {
    backgroundColor: colors.textSecondary + '20', paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md, borderRadius: borderRadius.md,
    borderWidth: 1, borderColor: colors.textSecondary,
  },
  intercityTextYes: { fontSize: fontSize.sm, fontWeight: '600', color: colors.success },
  intercityTextNo: { fontSize: fontSize.sm, fontWeight: '600', color: colors.textSecondary },

  remarkItem: {
    backgroundColor: colors.backgroundSecondary, padding: spacing.md,
    borderRadius: borderRadius.md, marginBottom: spacing.sm,
  },
  remarkItemAuto: {
    backgroundColor: colors.info + '12',
    borderLeftWidth: 3, borderLeftColor: colors.info,
  },
  remarkHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs },
  remarkAuthor: { fontSize: fontSize.sm, color: colors.text, fontWeight: '600' },
  remarkDate: { fontSize: fontSize.xs, color: colors.textSecondary },
  remarkText: { fontSize: fontSize.sm, color: colors.text, lineHeight: 20 },
  remarkTextAuto: { color: colors.info, fontStyle: 'italic' },

  infoCard: {
    backgroundColor: colors.success + '15', marginHorizontal: spacing.lg,
    marginTop: spacing.lg, padding: spacing.lg,
    borderRadius: borderRadius.xl, borderWidth: 1, borderColor: colors.success,
  },
  infoCardTitle: { fontSize: fontSize.md, fontWeight: '600', color: colors.success, marginBottom: spacing.xs },
  infoCardText: { fontSize: fontSize.sm, color: colors.text, lineHeight: 20 },

  continueButton: {
    paddingVertical: 14, paddingHorizontal: 16,
    borderRadius: borderRadius.lg, alignItems: 'center',
    marginHorizontal: spacing.lg, marginTop: spacing.lg, ...shadows.md,
  },
  gradientTouchable: { width: '100%', alignItems: 'center', paddingVertical: 16 },
  continueButtonText: { color: '#fff', fontSize: fontSize.md, fontWeight: '600' },

  submitButton: {
    paddingVertical: spacing.md, paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg, alignItems: 'center',
    marginTop: spacing.lg, ...shadows.md, minHeight: 50,
  },
  submitButtonTouchable: {
    width: '100%', alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.md,
  },
  submitButtonText: { color: '#fff', fontSize: fontSize.md, fontWeight: '600' },
  submitButtonDisabled: { opacity: 0.7 },

  loadingContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.backgroundSecondary,
  },
  loadingText: { marginTop: spacing.md, color: colors.textSecondary, fontSize: fontSize.md },
  emptyContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.backgroundSecondary, paddingHorizontal: spacing.lg,
  },
  emptyText: { color: colors.textSecondary, fontSize: fontSize.md, textAlign: 'center' },
});

export default Incentive;