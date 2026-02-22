// bup/incentive.tsx

import React, { useState, useEffect, useCallback } from 'react';
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
  status: 'pending' | 'correction' | 'accepted' | 'accepted_by_bdt' | 'payment_confirmation' | 'completed';
  remarks: Remark[];
  city?: string;
  collaborator_shares: CollaboratorShare[];
}

interface Participant {
  user: UserMinimal;
  is_assigned_user: boolean;
  user_id: number;
}

/** Per-participant share input — only stores the individual's share %, TDS is global */
interface ParticipantShareInput {
  user_id: number;
  user: UserMinimal;
  is_assigned_user: boolean;
  bdt_share_percentage: string; // individual
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

const hasValue = (v: number | null | undefined): boolean =>
  v !== null && v !== undefined && v !== 0;

const fmt = (value: string): string => {
  const number = value.replace(/[^0-9.]/g, '');
  const parts = number.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.');
};

const parse = (value: string): string => value.replace(/,/g, '');

const fmtCurrency = (amount: number | null): string => {
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

// ─── Component ────────────────────────────────────────────────────────────

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

  // Create-mode: income fields
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

  // Shared TDS % (one field for all participants)
  const [globalTdsPercentage, setGlobalTdsPercentage] = useState('');

  // Per-participant share inputs (create mode)
  const [participants, setParticipants]         = useState<Participant[]>([]);
  const [shareInputs, setShareInputs]           = useState<ParticipantShareInput[]>([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);

  // Edit-existing mode
  const [editShareInputs, setEditShareInputs]   = useState<ParticipantShareInput[]>([]);
  const [editGlobalTds, setEditGlobalTds]       = useState('');
  const [newRemark, setNewRemark]               = useState('');

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
        await buildEditShareInputs(data.incentive);
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

  // ── Fetch participants ─────────────────────────────────────────────────
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
            user_id:              p.user_id,
            user:                 p.user,
            is_assigned_user:     p.is_assigned_user,
            bdt_share_percentage: '',
          }))
        );
      }
    } catch (e) {
      console.error('fetchParticipants error', e);
    } finally {
      setLoadingParticipants(false);
    }
  }, [token, leadId]);

  // Pre-populate edit inputs from existing collaborator_shares
  const buildEditShareInputs = useCallback(async (incentive: IncentiveData) => {
    if (!token) return;
    let parts: Participant[] = [];
    try {
      const res = await fetch(`${BACKEND_URL}/manager/getLeadParticipants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, lead_id: leadId }),
      });
      if (res.ok) {
        const data = await res.json();
        parts = data.participants || [];
        setParticipants(parts);
      }
    } catch (e) {
      console.error('buildEditShareInputs participants error', e);
    }

    // Map existing shares by participant user_id
    const sharesByUserId = new Map<number, CollaboratorShare>();
    for (const s of incentive.collaborator_shares || []) {
      const p = parts.find(p => p.user.employee_id === s.user.employee_id);
      if (p) sharesByUserId.set(p.user_id, s);
    }

    // Derive a single global TDS from the first share that has one
    const firstShareWithTds = (incentive.collaborator_shares || []).find(
      s => s.tds_percentage != null
    );
    if (firstShareWithTds?.tds_percentage != null) {
      setEditGlobalTds(String(firstShareWithTds.tds_percentage));
    }

    setEditShareInputs(
      parts.map(p => {
        const existing = sharesByUserId.get(p.user_id);
        return {
          user_id:              p.user_id,
          user:                 p.user,
          is_assigned_user:     p.is_assigned_user,
          bdt_share_percentage: existing?.bdt_share_percentage != null
            ? String(existing.bdt_share_percentage)
            : '',
        };
      })
    );
  }, [token, leadId]);

  // ── Share input helpers ────────────────────────────────────────────────

  const updateSharePct = (
    index: number,
    value: string,
    isEdit: boolean
  ) => {
    const setter = isEdit ? setEditShareInputs : setShareInputs;
    setter(prev => {
      const next = [...prev];
      next[index] = { ...next[index], bdt_share_percentage: value };
      return next;
    });
  };

  // ── Calculation helpers ────────────────────────────────────────────────

  const calcBaseAmount = (
    gross: number, referral: number, bdExp: number, gw: number, isIntercity: boolean
  ) => {
    const net = gross - referral - bdExp - gw;
    return { net, base: isIntercity ? net * 0.5 : net };
  };

  const calcParticipantAmounts = (baseAmount: number, pct: string, tdsPct: string) => {
    const shareAmt = (baseAmount * (parseFloat(pct) || 0)) / 100;
    const tdsAmt   = (shareAmt * (parseFloat(tdsPct) || 0)) / 100;
    return { shareAmt, tdsAmt, final: shareAmt - tdsAmt };
  };

  // ── Validate share inputs ─────────────────────────────────────────────

  const validateShareInputs = (
    inputs: ParticipantShareInput[],
    tdsPct: string
  ): string | null => {
    if (inputs.length === 0) return null;
    for (const inp of inputs) {
      if (!inp.bdt_share_percentage || parseFloat(inp.bdt_share_percentage) <= 0) {
        return `Please enter Transaction Team Share % for ${inp.user.full_name}`;
      }
    }
    if (!tdsPct || parseFloat(tdsPct) < 0) {
      return 'Please enter a valid TDS %';
    }
    return null;
  };

  // ── Create incentive ───────────────────────────────────────────────────

  const createIncentive = async () => {
    if (!token) return;
    if (!grossIncome) { Alert.alert('Error', 'Please enter gross income'); return; }

    for (const expense of selectedExpenses) {
      if (!expenseValues[expense]) {
        Alert.alert('Error', 'Please enter values for all selected expenses');
        return;
      }
    }
    if (intercityDeals === 'Yes' && !selectedCity) {
      Alert.alert('Error', 'Please select a city for intercity deal'); return;
    }
    if (selectedCity === 'Other' && !customCity.trim()) {
      Alert.alert('Error', 'Please enter city name'); return;
    }

    const shareErr = validateShareInputs(shareInputs, globalTdsPercentage);
    if (shareErr) { Alert.alert('Error', shareErr); return; }

    const gross     = parseFloat(parse(grossIncome)) || 0;
    const referral  = parseFloat(parse(expenseValues.referral || '0')) || 0;
    const bdExp     = parseFloat(parse(expenseValues.bd_expenses || '0')) || 0;
    const gw        = parseFloat(parse(expenseValues.goodwill || '0')) || 0;
    const isIntercity = intercityDeals === 'Yes';
    const { net, base } = calcBaseAmount(gross, referral, bdExp, gw, isIntercity);
    const tdsPct = parseFloat(globalTdsPercentage) || 0;

    const participantSharesPayload = shareInputs.map(inp => {
      const { shareAmt, tdsAmt, final } = calcParticipantAmounts(
        base, inp.bdt_share_percentage, String(tdsPct)
      );
      return {
        user_id:              inp.user_id,
        bdt_share_percentage: parseFloat(inp.bdt_share_percentage),
        tds_percentage:       tdsPct,
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
          token,
          lead_id:              leadId,
          gross_income_recieved: parse(grossIncome),
          referral_amt:         referral,
          bdt_expenses:         bdExp,
          goodwill:             gw,
          intercity_deals:      isIntercity,
          intercity_amount:     isIntercity ? base : null,
          net_company_earning:  net,
          city:                 isIntercity ? cityToSend : null,
          participant_shares:   participantSharesPayload,
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

  // ── Update incentive ───────────────────────────────────────────────────

  const updateIncentive = async () => {
    if (!token || !incentiveData) return;

    const shareErr = validateShareInputs(editShareInputs, editGlobalTds);
    if (shareErr) { Alert.alert('Error', shareErr); return; }

    const base = (
      incentiveData.intercity_deals && incentiveData.intercity_amount
        ? incentiveData.intercity_amount
        : incentiveData.net_company_earning
    ) || 0;

    const tdsPct = parseFloat(editGlobalTds) || 0;

    const participantSharesPayload = editShareInputs.map(inp => ({
      user_id:              inp.user_id,
      bdt_share_percentage: parseFloat(inp.bdt_share_percentage) || 0,
      tds_percentage:       tdsPct,
    }));

    setSubmitting(true);
    try {
      const res = await fetch(`${BACKEND_URL}/manager/updateIncentive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          lead_id:            leadId,
          remark:             newRemark.trim() || undefined,
          participant_shares: participantSharesPayload,
        }),
      });
      if (!res.ok) throw new Error('Failed to update incentive');
      const data = await res.json();
      setIncentiveData(data.incentive);
      setNewRemark('');
      await buildEditShareInputs(data.incentive);
      Alert.alert('Success', 'Incentive updated! BDT will be notified to review.');
    } catch (e) {
      console.error('updateIncentive error', e);
      Alert.alert('Error', 'Failed to update incentive. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Accept / send for payment ──────────────────────────────────────────

  const acceptIncentive = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${BACKEND_URL}/manager/acceptIncentive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, lead_id: leadId }),
      });
      if (!res.ok) throw new Error();
      Alert.alert('Success', 'Incentive accepted!');
      fetchIncentive();
    } catch {
      Alert.alert('Error', 'Failed to accept incentive.');
    }
  };

  const sendForPayment = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${BACKEND_URL}/manager/sendIncentiveForPayment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, lead_id: leadId }),
      });
      if (!res.ok) throw new Error();
      Alert.alert('Success', 'Incentive sent for payment!');
      fetchIncentive();
    } catch {
      Alert.alert('Error', 'Failed to send for payment.');
    }
  };

  // ── Status helpers ─────────────────────────────────────────────────────

  const statusColor = (s: string) => {
    const map: Record<string, string> = {
      pending:              colors.warning,
      correction:           colors.warning,
      accepted:             colors.success,
      accepted_by_bdt:      colors.info,
      payment_confirmation: colors.primary,
      completed:            colors.success,
    };
    return map[s] ?? colors.textSecondary;
  };

  const statusLabel = (s: string) => {
    const map: Record<string, string> = {
      pending:              'Pending BUP Review',
      correction:           'Awaiting BDT Review',
      accepted:             'Accepted by BUP',
      accepted_by_bdt:      'Accepted by BDT',
      payment_confirmation: 'Payment Processing',
      completed:            'Completed',
    };
    return map[s] ?? s;
  };

  // ── Reusable UI pieces ─────────────────────────────────────────────────

  /** Standard green header bar (matches old component) */
  const GreenHeader = ({ tall = false }) => (
    <LinearGradient
      colors={['#075E54', '#075E54']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={[styles.greenHeader, tall && styles.greenHeaderTall]}
    >
      <View style={styles.greenHeaderContent} />
    </LinearGradient>
  );

  /** Back button row — always rendered inside the header view */
  const HeaderBar = ({
    title,
    onBackPress,
  }: {
    title: string;
    onBackPress: () => void;
  }) => (
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

  /**
   * ParticipantShareRow — only shows the individual share % input.
   * Live preview uses the shared globalTds / editGlobalTds.
   */
  const ParticipantShareRow = ({
    inp,
    index,
    baseAmount,
    tdsPct,
    isEdit,
  }: {
    inp: ParticipantShareInput;
    index: number;
    baseAmount: number;
    tdsPct: string;
    isEdit: boolean;
  }) => {
    const { shareAmt, tdsAmt, final } = calcParticipantAmounts(
      baseAmount,
      inp.bdt_share_percentage,
      tdsPct
    );
    const hasPreview =
      !!inp.bdt_share_percentage && parseFloat(inp.bdt_share_percentage) > 0;

    return (
      <View style={styles.participantRow}>
        {/* Header */}
        <View style={styles.participantHeader}>
          <View style={styles.participantAvatar}>
            <Text style={styles.participantAvatarText}>
              {(inp.user.first_name?.[0] ?? '?').toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.participantName}>{inp.user.full_name}</Text>
            <Text style={styles.participantRole}>
              {inp.is_assigned_user ? '👤 Assigned BDT' : '🤝 Collaborator'}
            </Text>
          </View>
        </View>

        {/* Share % input only */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Transaction Share % *</Text>
          <TextInput
            style={styles.input}
            value={inp.bdt_share_percentage}
            onChangeText={v =>
              updateSharePct(index, v.replace(/[^0-9.]/g, ''), isEdit)
            }
            placeholder="e.g. 60"
            keyboardType="numeric"
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        {/* Live preview */}
        {hasPreview && (
          <View style={styles.calculationPreview}>
            <View style={styles.calculationRow}>
              <Text style={styles.calculationLabel}>
                Share ({inp.bdt_share_percentage}%)
              </Text>
              <Text style={styles.calculationValue}>{fmtCurrency(shareAmt)}</Text>
            </View>
            <View style={styles.calculationRow}>
              <Text style={styles.calculationLabel}>
                Less TDS ({tdsPct || '0'}%)
              </Text>
              <Text style={[styles.calculationValue, styles.negativeValue]}>
                − {fmtCurrency(tdsAmt)}
              </Text>
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

  // ─── RENDER: Create mode — Review screen ──────────────────────────────

  if (isCreateMode && canCreate && showReview) {
    const gross     = parseFloat(parse(grossIncome)) || 0;
    const referral  = parseFloat(parse(expenseValues.referral || '0')) || 0;
    const bdExp     = parseFloat(parse(expenseValues.bd_expenses || '0')) || 0;
    const gw        = parseFloat(parse(expenseValues.goodwill || '0')) || 0;
    const isIntercity = intercityDeals === 'Yes';
    const { net, base } = calcBaseAmount(gross, referral, bdExp, gw, isIntercity);
    const tdsPct = globalTdsPercentage;

    return (
      <View style={styles.container}>
        {!hideHeader && (
          <>
            <StatusBar barStyle="light-content" backgroundColor="#075E54" />
            <GreenHeader />
            <HeaderBar
              title="Review & Confirm"
              onBackPress={() => setShowReview(false)}
            />
          </>
        )}
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>

          {/* Summary */}
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
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>TDS % (all participants)</Text>
              <Text style={styles.infoValue}>{tdsPct}%</Text>
            </View>
          </View>

          {/* Per-participant breakdown */}
          {shareInputs.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Per-Person Breakdown</Text>
              {shareInputs.map(inp => {
                const { shareAmt, tdsAmt, final } = calcParticipantAmounts(
                  base, inp.bdt_share_percentage, tdsPct
                );
                return (
                  <View key={inp.user_id} style={styles.reviewPersonRow}>
                    <Text style={styles.participantName}>{inp.user.full_name}</Text>
                    <Text style={styles.participantRole}>
                      {inp.is_assigned_user ? 'Assigned BDT' : 'Collaborator'}
                    </Text>
                    <View style={styles.calculationRow}>
                      <Text style={styles.calculationLabel}>
                        Share ({inp.bdt_share_percentage}%)
                      </Text>
                      <Text style={styles.calculationValue}>{fmtCurrency(shareAmt)}</Text>
                    </View>
                    <View style={styles.calculationRow}>
                      <Text style={styles.calculationLabel}>TDS ({tdsPct}%)</Text>
                      <Text style={[styles.calculationValue, styles.negativeValue]}>
                        − {fmtCurrency(tdsAmt)}
                      </Text>
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
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          >
            <TouchableOpacity
              onPress={createIncentive}
              disabled={submitting}
              style={styles.submitButtonTouchable}
              activeOpacity={0.8}
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

  // ─── RENDER: Create mode — Form screen ────────────────────────────────

  if (isCreateMode && canCreate) {
    const gross     = parseFloat(parse(grossIncome)) || 0;
    const referral  = parseFloat(parse(expenseValues.referral || '0')) || 0;
    const bdExp     = parseFloat(parse(expenseValues.bd_expenses || '0')) || 0;
    const gw        = parseFloat(parse(expenseValues.goodwill || '0')) || 0;
    const isIntercity = intercityDeals === 'Yes';
    const { net, base } = calcBaseAmount(gross, referral, bdExp, gw, isIntercity);

    const handleContinue = () => {
      if (!grossIncome) { Alert.alert('Error', 'Please enter gross income'); return; }
      for (const k of selectedExpenses) {
        if (!expenseValues[k]) {
          Alert.alert('Error', 'Please enter values for all selected expenses');
          return;
        }
      }
      if (isIntercity && !selectedCity) {
        Alert.alert('Error', 'Please select a city'); return;
      }
      if (selectedCity === 'Other' && !customCity.trim()) {
        Alert.alert('Error', 'Please enter city name'); return;
      }
      const shareErr = validateShareInputs(shareInputs, globalTdsPercentage);
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

          {/* Gross income */}
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

          {/* Expenses */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Expenses (Optional)</Text>
            <Text style={styles.expenseInfoText}>
              Check the expenses that apply and enter their amounts
            </Text>
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
                    {selectedExpenses.has(opt.key) && (
                      <Text style={styles.checkmark}>✓</Text>
                    )}
                  </View>
                  <Text style={styles.expenseLabel}>{opt.label}</Text>
                </TouchableOpacity>
                {selectedExpenses.has(opt.key) && (
                  <TextInput
                    style={styles.expenseInput}
                    value={expenseValues[opt.key]}
                    onChangeText={v =>
                      setExpenseValues(prev => ({ ...prev, [opt.key]: fmt(v) }))
                    }
                    placeholder="Enter amount"
                    keyboardType="numeric"
                    placeholderTextColor={colors.textSecondary}
                  />
                )}
              </View>
            ))}
          </View>

          {/* Intercity */}
          <View style={styles.card}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Intercity Deal? *</Text>
              <TouchableOpacity
                style={styles.dropdown}
                onPress={() => setShowIntercityDD(prev => !prev)}
              >
                <Text style={styles.dropdownText}>{intercityDeals}</Text>
                <Text style={styles.dropdownArrow}>{showIntercityDD ? '▲' : '▼'}</Text>
              </TouchableOpacity>
              {showIntercityDD && (
                <View style={styles.dropdownMenu}>
                  {['Yes', 'No'].map(opt => (
                    <TouchableOpacity
                      key={opt}
                      style={styles.dropdownItem}
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
                <TouchableOpacity
                  style={styles.dropdown}
                  onPress={() => setShowCityDD(prev => !prev)}
                >
                  <Text style={styles.dropdownText}>{selectedCity || 'Select a city'}</Text>
                  <Text style={styles.dropdownArrow}>{showCityDD ? '▲' : '▼'}</Text>
                </TouchableOpacity>
                {showCityDD && (
                  <View style={styles.dropdownMenu}>
                    {INTERCITY_CITIES.map(city => (
                      <TouchableOpacity
                        key={city}
                        style={styles.dropdownItem}
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

          {/* Transaction Team Share Distribution */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Transaction Team Share Distribution</Text>
            <Text style={styles.expenseInfoText}>
              Set the share % for each participant. A single TDS % applies to all.
              {base > 0
                ? ` Base amount: ₹${base.toLocaleString('en-IN')}`
                : ''}
            </Text>

            {/* ── Global TDS — ONE field for everyone ── */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>TDS % (applies to all participants) *</Text>
              <TextInput
                style={styles.input}
                value={globalTdsPercentage}
                onChangeText={v => setGlobalTdsPercentage(v.replace(/[^0-9.]/g, ''))}
                placeholder="e.g. 10"
                keyboardType="numeric"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            {/* ── Per-participant share % ── */}
            {loadingParticipants ? (
              <ActivityIndicator color={colors.primary} style={{ marginTop: 16 }} />
            ) : shareInputs.length === 0 ? (
              <Text style={styles.expenseInfoText}>No participants found for this lead.</Text>
            ) : (
              shareInputs.map((inp, idx) => (
                <ParticipantShareRow
                  key={inp.user_id}
                  inp={inp}
                  index={idx}
                  baseAmount={base}
                  tdsPct={globalTdsPercentage}
                  isEdit={false}
                />
              ))
            )}
          </View>

          <LinearGradient
            colors={['#075E54', '#075E54']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.continueButton}
          >
            <TouchableOpacity
              onPress={handleContinue}
              style={[styles.gradientTouchable,{ alignItems: 'center', paddingTop:5,paddingBottom:5 }]}
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

  // ─── RENDER: No incentive (canCreate = false) ──────────────────────────

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

  // ─── RENDER: Main incentive view ───────────────────────────────────────

  const baseForEdit = (
    incentiveData.intercity_deals && incentiveData.intercity_amount
      ? incentiveData.intercity_amount
      : incentiveData.net_company_earning
  ) || 0;

  const canEditShares =
    incentiveData.status === 'pending' || incentiveData.status === 'correction';

  return (
    <View style={styles.container}>
      {!hideHeader && (
        <>
          <StatusBar barStyle="light-content" backgroundColor="#075E54" />
          <GreenHeader />
          <HeaderBar
            title="Incentive Management"
            onBackPress={onBack}
          />
        </>
      )}

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>

        {/* ── Status Header ──────────────────────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.statusHeader}>
            <Text style={styles.cardTitle}>Lead: {leadName}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusColor(incentiveData.status) }]}>
              <Text style={styles.statusText}>{statusLabel(incentiveData.status)}</Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>BDT:</Text>
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

        {/* ── Transaction Details ────────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Transaction Details</Text>
          <View style={[styles.infoRow, styles.dividerRow]}>
            <Text style={styles.infoLabel}>Gross Income:</Text>
            <Text style={styles.infoValue}>{fmtCurrency(incentiveData.gross_income_recieved)}</Text>
          </View>
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
          {incentiveData.intercity_deals && incentiveData.intercity_amount != null && (
            <View style={[styles.infoRow, styles.highlightRow]}>
              <Text style={styles.calculationLabelBold}>Intercity Share (50%):</Text>
              <Text style={styles.calculationValueBold}>{fmtCurrency(incentiveData.intercity_amount)}</Text>
            </View>
          )}
        </View>

        {/* ── BUP input: set / update per-participant shares ──────────── */}
        {canEditShares && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Set Transaction Share & TDS</Text>
            <Text style={styles.expenseInfoText}>
              Set the share % for each participant and a single TDS % for all.
              {'\n'}Base amount:{' '}
              <Text style={{ fontWeight: '700' }}>
                ₹{baseForEdit.toLocaleString('en-IN')}
              </Text>
            </Text>

            {/* Global TDS — single field */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>TDS % (applies to all participants) *</Text>
              <TextInput
                style={styles.input}
                value={editGlobalTds}
                onChangeText={v => setEditGlobalTds(v.replace(/[^0-9.]/g, ''))}
                placeholder="e.g. 10"
                keyboardType="numeric"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            {/* Per-participant share % */}
            {editShareInputs.length === 0 ? (
              <ActivityIndicator color={colors.primary} style={{ marginTop: 12 }} />
            ) : (
              editShareInputs.map((inp, idx) => (
                <ParticipantShareRow
                  key={inp.user_id}
                  inp={inp}
                  index={idx}
                  baseAmount={baseForEdit}
                  tdsPct={editGlobalTds}
                  isEdit={true}
                />
              ))
            )}

            {/* Optional remark */}
            <View style={[styles.inputGroup, { marginTop: spacing.md }]}>
              <Text style={styles.label}>Remark for BDT (optional)</Text>
              <TextInput
                style={styles.remarkInput}
                value={newRemark}
                onChangeText={setNewRemark}
                placeholder="Add a note for BDT…"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <LinearGradient
              colors={['#075E54', '#075E54']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            >
              <TouchableOpacity
                onPress={updateIncentive}
                disabled={submitting}
                style={styles.submitButtonTouchable}
                activeOpacity={0.8}
              >
                {submitting
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.submitButtonText}>Update Incentive</Text>
                }
              </TouchableOpacity>
            </LinearGradient>
          </View>
        )}

        {/* ── Existing per-person breakdown (read-only) ──────────────── */}
        {!canEditShares && (incentiveData.collaborator_shares?.length ?? 0) > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Transaction Share Breakdown</Text>
            {/* Show shared TDS once at the top */}
            {incentiveData.collaborator_shares[0]?.tds_percentage != null && (
              <View style={[styles.infoRow, styles.dividerRow, { marginBottom: spacing.sm }]}>
                <Text style={styles.infoLabel}>TDS % (all participants)</Text>
                <Text style={styles.infoValue}>
                  {incentiveData.collaborator_shares[0].tds_percentage}%
                </Text>
              </View>
            )}
            {incentiveData.collaborator_shares.map(share => (
              <View key={share.id} style={styles.existingShareRow}>
                <View style={styles.participantHeader}>
                  <View style={styles.participantAvatar}>
                    <Text style={styles.participantAvatarText}>
                      {(share.user.first_name?.[0] ?? '?').toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.participantName}>{share.user.full_name}</Text>
                    <Text style={styles.participantRole}>
                      {share.is_assigned_user ? '👤 Assigned BDT' : '🤝 Collaborator'}
                    </Text>
                  </View>
                </View>
                <View style={styles.calculationPreview}>
                  <View style={styles.calculationRow}>
                    <Text style={styles.calculationLabel}>
                      Share ({share.bdt_share_percentage ?? '—'}%)
                    </Text>
                    <Text style={styles.calculationValue}>{fmtCurrency(share.bdt_share)}</Text>
                  </View>
                  <View style={styles.calculationRow}>
                    <Text style={styles.calculationLabel}>
                      Less TDS ({share.tds_percentage ?? '—'}%)
                    </Text>
                    <Text style={[styles.calculationValue, styles.negativeValue]}>
                      − {fmtCurrency(share.tds_deducted)}
                    </Text>
                  </View>
                  <View style={[styles.calculationRow, styles.finalRow]}>
                    <Text style={styles.finalLabel}>Net Payable</Text>
                    <Text style={styles.finalValue}>{fmtCurrency(share.final_amount_payable)}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Pending box when no shares set yet and not in editable state */}
        {!canEditShares &&
          (!incentiveData.collaborator_shares || incentiveData.collaborator_shares.length === 0) && (
          <View style={styles.card}>
            <View style={styles.pendingBupBox}>
              <Text style={styles.pendingBupIcon}>⏳</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.pendingBupTitle}>Not Yet Calculated</Text>
                <Text style={styles.pendingBupSubtext}>
                  Transaction Team shares and TDS have not been set yet.
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* ── Remarks ───────────────────────────────────────────────── */}
        {incentiveData.remarks?.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Remarks ({incentiveData.remarks.length})</Text>
            {incentiveData.remarks.map((r, i) => (
              <View key={i} style={styles.remarkItem}>
                <View style={styles.remarkHeader}>
                  <Text style={styles.remarkAuthor}>{r.username}</Text>
                  <Text style={styles.remarkDate}>{fmtDate(r.created_at)}</Text>
                </View>
                <Text style={styles.remarkText}>{r.remark}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Action Buttons ────────────────────────────────────────── */}
        {incentiveData.status === 'accepted_by_bdt' && (
          <TouchableOpacity style={styles.acceptButton} onPress={acceptIncentive}>
            <Text style={styles.acceptButtonText}>Accept Incentive</Text>
          </TouchableOpacity>
        )}
        {incentiveData.status === 'accepted' && (
          <TouchableOpacity style={styles.acceptButton} onPress={sendForPayment}>
            <Text style={styles.acceptButtonText}>Send for Payment</Text>
          </TouchableOpacity>
        )}
        {incentiveData.status === 'completed' && (
          <View style={styles.infoCard}>
            <Text style={styles.infoCardTitle}>✅ Completed</Text>
            <Text style={styles.infoCardText}>
              This incentive has been fully processed. No further actions are available.
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

  // Header (restored from old component)
  greenHeader: {
    paddingTop: 80,
    paddingBottom: 0,
    paddingHorizontal: 20,
    height: Platform.OS === 'ios' ? 130 : 80,
  },
  greenHeaderTall: {
    height: Platform.OS === 'ios' ? 150 : 110,
  },
  greenHeaderContent: { marginTop: 0, paddingBottom: 30 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.primary,
    marginTop: Platform.OS === 'ios' ? -10 : 0,
    paddingTop: Platform.OS === 'ios' ? 80 : 50,
    paddingBottom: 20,
  },
  headerWithGreen: {
    backgroundColor: 'transparent',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    marginBottom: 20,
  },
  headerTitle: {
    fontWeight: '600',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
    fontSize: 20,
  },
  headerSpacer: { width: 40 },
  backButton:  { padding: spacing.sm, borderRadius: borderRadius.sm },
  backIcon:    { height: 24, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
  backArrow:   {
    width: 12, height: 12,
    borderLeftWidth: 2, borderTopWidth: 2,
    borderColor: '#fff',
    transform: [{ rotate: '-45deg' }],
  },
  backText: { color: '#fff', fontSize: 16, marginLeft: 2 },

  // Cards
  card: {
    backgroundColor: colors.white,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    ...shadows.md,
  },
  cardTitle:    { fontSize: fontSize.lg, fontWeight: '600', color: colors.text, marginBottom: spacing.md },
  reviewTitle:  { fontSize: fontSize.xl, fontWeight: '700', color: colors.primary, marginBottom: spacing.xs },
  leadName:     { fontSize: fontSize.md, color: colors.textSecondary, fontWeight: '500', marginBottom: spacing.md },

  // Inputs
  inputGroup: { marginBottom: spacing.md },
  label: {
    fontSize: fontSize.sm, fontWeight: '600', color: colors.text, marginBottom: spacing.sm,
  },
  input: {
    borderWidth: 1, borderColor: colors.border,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    fontSize: fontSize.md, color: colors.text,
    backgroundColor: colors.white,
  },
  remarkInput: {
    borderWidth: 1, borderColor: colors.border,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    backgroundColor: colors.white,
    fontSize: fontSize.sm, color: colors.text,
    textAlignVertical: 'top', minHeight: 80,
  },

  // Expenses
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
    borderRadius: borderRadius.sm, alignItems: 'center', justifyContent: 'center',
    marginRight: spacing.sm,
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

  // Dropdown
  dropdown: {
    borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.white,
  },
  dropdownText:  { fontSize: fontSize.md, color: colors.text, fontWeight: '500' },
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
  selectedText:     { color: colors.primary, fontWeight: '600' },

  // Summary grid
  summaryGrid: {
    flexDirection: 'row', justifyContent: 'space-between',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.lg, padding: spacing.md, marginBottom: spacing.md,
  },
  summaryItem:  { flex: 1, alignItems: 'center' },
  summaryLabel: { fontSize: fontSize.sm, color: colors.textSecondary, marginBottom: spacing.xs },
  summaryValue: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },

  // Participant rows
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
  participantName:       { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
  participantRole:       { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },

  // Calculation rows
  calculationPreview: {
    backgroundColor: colors.backgroundSecondary,
    padding: spacing.md, borderRadius: borderRadius.lg, marginTop: spacing.sm,
  },
  calculationRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  calculationLabel:      { fontSize: fontSize.sm, color: colors.textSecondary, flex: 1 },
  calculationValue:      { fontSize: fontSize.sm, color: colors.text, fontWeight: '500' },
  calculationLabelBold:  { fontSize: fontSize.sm, color: colors.text, fontWeight: '600', flex: 1 },
  calculationValueBold:  { fontSize: fontSize.sm, color: colors.text, fontWeight: '700' },
  negativeValue:         { color: colors.error },
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

  // Review person rows
  reviewPersonRow: {
    marginTop: spacing.md, paddingTop: spacing.md,
    borderTopWidth: 1, borderTopColor: colors.border,
  },

  // Existing share rows (read-only view)
  existingShareRow: {
    marginTop: spacing.md, paddingTop: spacing.md,
    borderTopWidth: 1, borderTopColor: colors.border,
  },

  // Status
  statusHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: spacing.md,
  },
  statusBadge: {
    marginTop: -15, paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm, borderRadius: borderRadius.lg,
  },
  statusText: { color: '#fff', fontSize: 12, fontWeight: '600' },

  // Info rows
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingVertical: spacing.xs,
  },
  dividerRow:   { borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: spacing.sm },
  infoLabel:    { fontSize: fontSize.sm, color: colors.textSecondary },
  infoValue:    { fontSize: fontSize.sm, color: colors.text, fontWeight: '500' },

  // Badges
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
  intercityTextNo:  { fontSize: fontSize.sm, fontWeight: '600', color: colors.textSecondary },

  // Pending box
  pendingBupBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm,
    padding: spacing.md, backgroundColor: colors.warning + '15',
    borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.warning,
  },
  pendingBupIcon:    { fontSize: 20 },
  pendingBupTitle:   { fontSize: fontSize.sm, fontWeight: '700', color: colors.warning, marginBottom: 2 },
  pendingBupSubtext: { fontSize: fontSize.xs, color: colors.text, lineHeight: 16 },

  // Remarks
  remarkItem: {
    backgroundColor: colors.backgroundSecondary, padding: spacing.md,
    borderRadius: borderRadius.md, marginBottom: spacing.sm,
  },
  remarkHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs },
  remarkAuthor: { fontSize: fontSize.sm, color: colors.text, fontWeight: '600' },
  remarkDate:   { fontSize: fontSize.xs, color: colors.textSecondary },
  remarkText:   { fontSize: fontSize.sm, color: colors.text, lineHeight: 20 },

  // Info card
  infoCard: {
    backgroundColor: colors.info + '15', marginHorizontal: spacing.lg,
    marginTop: spacing.lg, padding: spacing.lg,
    borderRadius: borderRadius.xl, borderWidth: 1, borderColor: colors.info,
  },
  infoCardTitle: { fontSize: fontSize.md, fontWeight: '600', color: colors.info, marginBottom: spacing.xs },
  infoCardText:  { fontSize: fontSize.sm, color: colors.text, lineHeight: 20 },

  // Buttons
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
    width: '100%', alignItems: 'center',
    justifyContent: 'center', paddingVertical: spacing.md,
  },
  submitButtonText:     { color: '#fff', fontSize: fontSize.md, fontWeight: '600' },
  submitButtonDisabled: { opacity: 0.7 },

  acceptButton: {
    backgroundColor: colors.success, paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg, borderRadius: borderRadius.lg,
    alignItems: 'center', marginHorizontal: spacing.lg,
    marginTop: spacing.lg, ...shadows.md,
  },
  acceptButtonText: { color: '#fff', fontSize: fontSize.md, fontWeight: '600' },

  // Misc
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