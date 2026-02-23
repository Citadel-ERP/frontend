// bdt incentive — updated to show only the requesting user's personal share
// The backend now returns `incentive.my_share` which is either null (BUP has
// not yet set this user's share) or { bdt_share, tds_deducted, final_amount_payable }.

import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  StatusBar, Alert, TextInput, ActivityIndicator, Platform,
} from 'react-native';
import { colors, spacing, fontSize, borderRadius, shadows } from './theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BACKEND_URL } from '../../config/config';
import { LinearGradient } from 'expo-linear-gradient';

const TOKEN_KEY = 'token_2';

// ─── Props ────────────────────────────────────────────────────────────────────

interface IncentiveProps {
  onBack: () => void;
  leadId: number;
  leadName: string;
  hideHeader?: boolean;
  /** Pass true only when lead.subphase === 'payment_received' and no incentive exists yet */
  canCreate?: boolean;
  /** Called after a new incentive is successfully created (used by BDT.tsx workflow) */
  onIncentiveCreated?: () => void;
}

// ─── Data shapes ──────────────────────────────────────────────────────────────

interface BDTUser {
  employee_id: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  role: string;
  profile_picture: string | null;
  is_approved_by_hr: boolean;
  is_approved_by_admin: boolean;
  is_archived: boolean;
  designation: string | null;
}

interface Remark {
  remark: string;
  user_id: number | null;
  username: string;
  created_at: string;
}

/**
 * `my_share` is the new field added by the backend.
 * It holds ONLY the share that BUP allocated to the requesting BDT user.
 * null means BUP has not yet set this user's share.
 */
interface MyShare {
  bdt_share: number | null;
  tds_deducted: number | null;
  final_amount_payable: number | null;
}

interface IncentiveData {
  id: number;
  bdt: BDTUser;
  lead: number;
  created_at: string;
  updated_at: string;
  gross_income_recieved: number;
  intercity_deals: boolean;
  intercity_amount: number | null;
  referral_amt: number;
  bdt_expenses: number;
  goodwill: number;
  staff_incentive: number | null;
  // The aggregate bdt_share on the root incentive still exists for BUP's use;
  // BDT users should use my_share instead.
  tds_deducted: number | null;
  net_company_earning: number | null;
  bdt_share: number | null;
  less_tax: number | null;
  final_amount_payable: number | null;
  status: 'pending' | 'correction' | 'accepted' | 'accepted_by_bdt' | 'payment_raised' | 'paid' | 'completed';
  remarks: Remark[];
  city?: string;
  /** Per-user share allocated by BUP for the requesting BDT user. null = not yet set. */
  my_share: MyShare | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const EXPENSE_OPTIONS = [
  { label: 'Referral',   key: 'referral'    },
  { label: 'BD Expenses', key: 'bd_expenses' },
  // { label: 'Goodwill',   key: 'goodwill'    },
];

const INTERCITY_CITIES = [
  'Bangalore', 'Chennai', 'Hyderabad', 'Mumbai', 'NCR', 'Pune', 'Other',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns true only when v is a real, non-zero number */
const hasValue = (v: number | null | undefined): boolean =>
  v !== null && v !== undefined && v !== 0;

/** True when a MyShare object has actual share data set by BUP */
const shareIsSet = (share: MyShare | null): boolean =>
  share !== null && hasValue(share.bdt_share);

// ─── Component ────────────────────────────────────────────────────────────────

const Incentive: React.FC<IncentiveProps> = ({
  onBack,
  leadId,
  leadName,
  hideHeader,
  canCreate = false,
  onIncentiveCreated,
}) => {
  const [token, setToken]               = useState<string | null>(null);
  const [loading, setLoading]           = useState(false);
  const [incentiveData, setIncentiveData] = useState<IncentiveData | null>(null);
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [showCalculation, setShowCalculation] = useState(false);
  const [newRemark, setNewRemark]       = useState('');
  const [addingRemark, setAddingRemark] = useState(false);

  // Create-form state
  const [grossIncome, setGrossIncome]   = useState('');
  const [selectedExpenses, setSelectedExpenses] = useState<Set<string>>(new Set());
  const [expenseValues, setExpenseValues] = useState<Record<string, string>>({
    referral: '', bd_expenses: '', goodwill: '',
  });
  const [intercityDeals, setIntercityDeals]     = useState('No');
  const [showIntercityDD, setShowIntercityDD]   = useState(false);
  const [selectedCity, setSelectedCity]         = useState('');
  const [showCityDD, setShowCityDD]             = useState(false);
  const [customCity, setCustomCity]             = useState('');

  // ── Token ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    AsyncStorage.getItem(TOKEN_KEY)
      .then(t => setToken(t))
      .catch(e => console.error('Error getting token:', e));
  }, []);

  useEffect(() => {
    if (token) fetchIncentive();
  }, [token]);

  // ── Number formatting helpers ──────────────────────────────────────────────
  const fmt = (value: string) => {
    const n = value.replace(/[^0-9.]/g, '');
    const p = n.split('.');
    p[0] = p[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return p.join('.');
  };
  const parse = (value: string) => value.replace(/,/g, '');

  // ── Fetch incentive ────────────────────────────────────────────────────────
  const fetchIncentive = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await fetch(`${BACKEND_URL}/employee/getIncentive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, lead_id: leadId }),
      });

      const contentType = res.headers.get('content-type') ?? '';
      if (!contentType.includes('application/json')) {
        // Unexpected response — treat as "no incentive"
        canCreate ? setIsCreateMode(true) : setIncentiveData(null);
        return;
      }

      const data = await res.json();

      if (res.ok) {
        // ── Incentive exists — pre-fill form fields for possible edit ─────
        const inc: IncentiveData = data.incentive;
        setIncentiveData(inc);
        setIsCreateMode(false);
        setGrossIncome(fmt(inc.gross_income_recieved.toString()));

        const newSelected = new Set<string>();
        const newValues: Record<string, string> = { referral: '', bd_expenses: '', goodwill: '' };
        if (inc.referral_amt > 0)  { newSelected.add('referral');    newValues.referral    = fmt(inc.referral_amt.toString()); }
        if (inc.bdt_expenses > 0)  { newSelected.add('bd_expenses'); newValues.bd_expenses = fmt(inc.bdt_expenses.toString()); }
        if (inc.goodwill > 0)      { newSelected.add('goodwill');    newValues.goodwill    = fmt(inc.goodwill.toString()); }
        setExpenseValues(newValues);
        setSelectedExpenses(newSelected);
        setIntercityDeals(inc.intercity_deals ? 'Yes' : 'No');
        if (inc.city) setSelectedCity(inc.city);
      } else {
        // ── No incentive (or error) ────────────────────────────────────────
        if (data.message?.includes('already paid')) {
          Alert.alert('Notice', 'This incentive has been paid and is no longer visible.');
          onBack();
        } else if (canCreate) {
          setIsCreateMode(true);
        } else {
          setIncentiveData(null);
        }
      }
    } catch (err) {
      console.error('Error fetching incentive:', err);
      canCreate ? setIsCreateMode(true) : setIncentiveData(null);
    } finally {
      setLoading(false);
    }
  };

  // ── Expense helpers ────────────────────────────────────────────────────────
  const toggleExpense = (key: string) => {
    const next = new Set(selectedExpenses);
    if (next.has(key)) { next.delete(key); setExpenseValues(p => ({ ...p, [key]: '' })); }
    else { next.add(key); }
    setSelectedExpenses(next);
  };

  // ── Calculate from form ────────────────────────────────────────────────────
  const calcFromForm = () => {
    const gross      = parseFloat(parse(grossIncome)) || 0;
    const referral   = expenseValues.referral    ? parseFloat(parse(expenseValues.referral))    : 0;
    const bdExp      = expenseValues.bd_expenses ? parseFloat(parse(expenseValues.bd_expenses)) : 0;
    const goodwillAmt = expenseValues.goodwill   ? parseFloat(parse(expenseValues.goodwill))   : 0;
    const netEarning = gross - referral - bdExp - goodwillAmt;
    const isIntercity = intercityDeals === 'Yes';
    const intercityAmount = isIntercity ? netEarning * 0.5 : netEarning;
    return { gross, referral, bdExp, goodwillAmt, netEarning, intercityAmount };
  };

  // ── Validate create form ───────────────────────────────────────────────────
  const validateForm = (): boolean => {
    if (!grossIncome) { Alert.alert('Error', 'Please enter gross income'); return false; }
    for (const key of selectedExpenses) {
      if (!expenseValues[key]) { Alert.alert('Error', 'Please enter values for all selected expenses'); return false; }
    }
    if (intercityDeals === 'Yes' && !selectedCity) { Alert.alert('Error', 'Please select a city for intercity deal'); return false; }
    if (selectedCity === 'Other' && !customCity.trim()) { Alert.alert('Error', 'Please enter city name'); return false; }
    return true;
  };

  // ── Create incentive ───────────────────────────────────────────────────────
  const createIncentive = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const c = calcFromForm();
      const isIntercity = intercityDeals === 'Yes';
      const cityToSend  = selectedCity === 'Other' ? customCity : selectedCity;

      const res = await fetch(`${BACKEND_URL}/employee/createIncentive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          lead_id:               leadId,
          gross_income_recieved: parse(grossIncome),
          referral_amt:          expenseValues.referral    ? parse(expenseValues.referral)    : 0,
          bdt_expenses:          expenseValues.bd_expenses ? parse(expenseValues.bd_expenses) : 0,
          goodwill:              expenseValues.goodwill    ? parse(expenseValues.goodwill)    : 0,
          intercity_deals:       isIntercity,
          intercity_amount:      c.intercityAmount,
          net_company_earning:   c.netEarning,
          // BDT does NOT set share/TDS — BUP will set them per-user later
          bdt_share:            null,
          tds_deducted:         null,
          less_tax:             null,
          final_amount_payable: null,
          city: isIntercity ? cityToSend : null,
        }),
      });

      if (!res.ok) throw new Error('Failed to create incentive');
      const data = await res.json();
      setIncentiveData(data.incentive);
      setIsCreateMode(false);
      setShowCalculation(false);
      Alert.alert('Success', 'Incentive created successfully!');
      if (onIncentiveCreated) onIncentiveCreated();
    } catch (err) {
      console.error('Error creating incentive:', err);
      Alert.alert('Error', 'Failed to create incentive. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Add remark ─────────────────────────────────────────────────────────────
  const addRemark = async () => {
    if (!token || !newRemark.trim()) { Alert.alert('Error', 'Please enter a remark'); return; }
    try {
      setAddingRemark(true);
      const res = await fetch(`${BACKEND_URL}/employee/addRemark`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, lead_id: leadId, remark: newRemark.trim() }),
      });
      if (!res.ok) throw new Error('Failed to add remark');
      const data = await res.json();
      setIncentiveData(data.incentive);
      setNewRemark('');
      Alert.alert('Success', 'Remark added successfully!');
    } catch (err) {
      console.error('Error adding remark:', err);
      Alert.alert('Error', 'Failed to add remark. Please try again.');
    } finally {
      setAddingRemark(false);
    }
  };

  // ── Accept incentive (BDT confirms BUP's calculations) ────────────────────
  const acceptIncentive = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${BACKEND_URL}/employee/acceptIncentive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, lead_id: leadId }),
      });
      if (!res.ok) throw new Error('Failed to accept incentive');
      Alert.alert('Success', 'Incentive accepted successfully!');
      fetchIncentive();
    } catch (err) {
      console.error('Error accepting incentive:', err);
      Alert.alert('Error', 'Failed to accept incentive. Please try again.');
    }
  };

  // ── Accept payment confirmation ────────────────────────────────────────────
  const acceptPaymentConfirmation = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${BACKEND_URL}/employee/acceptPaymentConfirmation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, lead_id: leadId }),
      });
      if (!res.ok) throw new Error('Failed to accept payment confirmation');
      Alert.alert('Success', 'Payment confirmation accepted successfully!');
      fetchIncentive();
    } catch (err) {
      console.error('Error accepting payment confirmation:', err);
      Alert.alert('Error', 'Failed to accept payment confirmation. Please try again.');
    }
  };

  // ── Formatters ─────────────────────────────────────────────────────────────
  const formatDate = (ds: string) =>
    new Date(ds).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });

  const formatCurrency = (amount: number | null): string => {
    if (amount === null || amount === undefined) return '₹0.00';
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getStatusColor = (s: string): string => ({
    pending:          colors.warning,
    correction:       colors.error,
    accepted:         colors.success,
    accepted_by_bdt:  colors.success,
    payment_raised:   colors.info,
    payment_confirmation: colors.info,
    completed:        colors.primary,
  }[s] ?? colors.textSecondary);

  const getStatusText = (s: string): string => ({
    pending:              'Under Review',
    correction:           'Needs Correction',
    accepted:             'Accepted',
    accepted_by_bdt:      'Confirmed by BDT',
    payment_raised:       'Payment Processing',
    payment_confirmation: 'Payment Processing',
    completed:            'Completed',
  }[s] ?? s);

  // ─── Sub-components ─────────────────────────────────────────────────────────

  const BackIcon = () => (
    <View style={s.backIcon}>
      <View style={s.backArrow} />
      <Text style={s.backText}>Back</Text>
    </View>
  );

  const GreenHeader = () => (
    <LinearGradient
      colors={['#075E54', '#075E54']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={s.greenHeader}
    >
      <View style={s.greenHeaderContent} />
    </LinearGradient>
  );

  const HeaderBar = ({ title, onPressBack }: { title: string; onPressBack: () => void }) => (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#075E54" />
      <GreenHeader />
      <View style={[s.header, s.headerWithGreen]}>
        <TouchableOpacity style={s.backButton} onPress={onPressBack}>
          <BackIcon />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{title}</Text>
        <View style={s.headerSpacer} />
      </View>
    </>
  );

  /**
   * "My Share" card — shown in the earnings breakdown.
   * Conditionally renders either the user's actual share (set by BUP)
   * or a "pending BUP calculation" notice.
   */
  const MyShareSection = ({ share }: { share: MyShare | null }) => {
    if (shareIsSet(share)) {
      // BUP has already allocated a share for this user
      return (
        <>
          <View style={s.calculationRow}>
            <Text style={s.calculationLabel}>Your Transaction Share</Text>
            <Text style={s.calculationValue}>{formatCurrency(share!.bdt_share)}</Text>
          </View>
          <View style={s.calculationRow}>
            <Text style={s.calculationLabel}>Less: TDS</Text>
            <Text style={[s.calculationValue, s.negativeValue]}>
              - {formatCurrency(share!.tds_deducted)}
            </Text>
          </View>
          {hasValue(share!.final_amount_payable) && (
            <View style={[s.calculationRow, s.finalRow]}>
              <Text style={s.finalLabel}>Your Final Amount Payable</Text>
              <Text style={s.finalValue}>{formatCurrency(share!.final_amount_payable)}</Text>
            </View>
          )}
        </>
      );
    }

    // BUP has not yet set this user's share
    return (
      <View style={s.pendingBupBox}>
        <Text style={s.pendingBupIcon}>⏳</Text>
        <View style={{ flex: 1 }}>
          <Text style={s.pendingBupTitle}>Pending BUP Calculation</Text>
          <Text style={s.pendingBupSubtext}>
            Your Transaction Team Share, TDS &amp; Final Amount will be set by BUP team.
          </Text>
        </View>
      </View>
    );
  };

  // ─── Loading state ──────────────────────────────────────────────────────────
  if (loading && !incentiveData && !isCreateMode) {
    return (
      <View style={s.container}>
        {!hideHeader && <HeaderBar title="Incentive Checklist" onPressBack={onBack} />}
        <View style={s.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={s.loadingText}>Loading incentive data...</Text>
        </View>
      </View>
    );
  }

  // ─── Create mode: Review screen ─────────────────────────────────────────────
  if (isCreateMode && canCreate && showCalculation) {
    const c = calcFromForm();
    return (
      <View style={s.container}>
        {!hideHeader && (
          <>
            <StatusBar barStyle="light-content" backgroundColor="#075E54" />
            <View style={s.header}>
              <TouchableOpacity style={s.backButton} onPress={() => setShowCalculation(false)}>
                <BackIcon />
              </TouchableOpacity>
              <Text style={s.headerTitle}>Review &amp; Submit</Text>
              <View style={s.headerSpacer} />
            </View>
          </>
        )}
        <ScrollView style={s.scrollView} showsVerticalScrollIndicator={false}>
          <View style={s.card}>
            <Text style={s.reviewTitle}>Review Details</Text>
            <Text style={s.leadName}>Lead: {leadName}</Text>
          </View>

          {/* Summary grid */}
          <View style={s.card}>
            <Text style={s.cardTitle}>Summary</Text>
            <View style={s.summaryGrid}>
              <View style={s.summaryItem}>
                <Text style={s.summaryLabel}>Gross Income</Text>
                <Text style={s.summaryValue}>₹{c.gross.toLocaleString('en-IN')}</Text>
              </View>
              <View style={s.summaryItem}>
                <Text style={s.summaryLabel}>Net Earning</Text>
                <Text style={s.summaryValue}>₹{c.netEarning.toLocaleString('en-IN')}</Text>
              </View>
            </View>
          </View>

          {/* Expenses */}
          {selectedExpenses.size > 0 && (
            <View style={s.card}>
              <Text style={s.cardTitle}>Expenses</Text>
              {c.referral  > 0 && <View style={s.expenseSummaryRow}><Text style={s.infoLabel}>Referral</Text><Text style={s.infoValue}>₹{c.referral.toLocaleString('en-IN')}</Text></View>}
              {c.bdExp     > 0 && <View style={s.expenseSummaryRow}><Text style={s.infoLabel}>BD Expenses</Text><Text style={s.infoValue}>₹{c.bdExp.toLocaleString('en-IN')}</Text></View>}
              {c.goodwillAmt > 0 && <View style={s.expenseSummaryRow}><Text style={s.infoLabel}>Goodwill</Text><Text style={s.infoValue}>₹{c.goodwillAmt.toLocaleString('en-IN')}</Text></View>}
            </View>
          )}

          {/* Deal info */}
          <View style={s.card}>
            <Text style={s.cardTitle}>Deal Information</Text>
            <View style={s.infoRow}>
              <Text style={s.infoLabel}>Deal Type:</Text>
              <View style={intercityDeals === 'Yes' ? s.badgeYes : s.badgeNo}>
                <Text style={intercityDeals === 'Yes' ? s.badgeTextYes : s.badgeTextNo}>
                  {intercityDeals === 'Yes' ? 'Intercity' : 'Local'}
                </Text>
              </View>
            </View>
            {intercityDeals === 'Yes' && selectedCity && (
              <View style={s.infoRow}>
                <Text style={s.infoLabel}>City:</Text>
                <Text style={s.infoValue}>{selectedCity === 'Other' ? customCity : selectedCity}</Text>
              </View>
            )}
            {intercityDeals === 'Yes' && (
              <View style={s.infoRow}>
                <Text style={s.infoLabel}>Intercity Amount (50%):</Text>
                <Text style={s.infoValue}>₹{c.intercityAmount.toLocaleString('en-IN')}</Text>
              </View>
            )}
          </View>

          {/* BDT note */}
          <View style={s.infoCard}>
            <Text style={s.infoCardTitle}>📋 Important Note</Text>
            <Text style={s.infoCardText}>
              Your final earnings (Transaction Team Share &amp; TDS) will be calculated by BUP
              team after reviewing all details.
            </Text>
          </View>

          <LinearGradient
            colors={['#075E54', '#075E54']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[s.submitButton, loading && s.disabledBtn]}
          >
            <TouchableOpacity
              onPress={createIncentive}
              disabled={loading}
              style={s.submitBtnTouchable}
              activeOpacity={0.8}
            >
              {loading
                ? <ActivityIndicator color={colors.white} size="small" />
                : <Text style={s.submitBtnText}>Submit Incentive</Text>
              }
            </TouchableOpacity>
          </LinearGradient>

          <View style={{ height: 100 }} />
        </ScrollView>
      </View>
    );
  }

  // ─── Create mode: Form screen ────────────────────────────────────────────────
  if (isCreateMode && canCreate) {
    return (
      <View style={s.container}>
        {!hideHeader && <HeaderBar title="Checklist for Incentive" onPressBack={onBack} />}
        <ScrollView style={s.scrollView} showsVerticalScrollIndicator={false}>
          <View style={s.card}>
            <Text style={s.sectionTitle}>Create Incentive</Text>
            <Text style={s.leadNameLarge}>Lead: {leadName}</Text>
          </View>

          {/* Gross income */}
          <View style={s.card}>
            <Text style={s.label}>Gross Income Received *</Text>
            <TextInput
              style={s.input}
              value={grossIncome}
              onChangeText={t => setGrossIncome(fmt(t))}
              placeholder="Enter amount (e.g., 1,00,000)"
              keyboardType="numeric"
            />
          </View>

          {/* Expenses */}
          <View style={s.card}>
            <Text style={s.label}>Select Expenses (Optional)</Text>
            <Text style={s.expenseInfoText}>Check the expenses that apply and enter their amounts</Text>
            {EXPENSE_OPTIONS.map(opt => (
              <View key={opt.key} style={s.expenseItem}>
                <TouchableOpacity style={s.checkboxContainer} onPress={() => toggleExpense(opt.key)}>
                  <View style={[s.checkbox, selectedExpenses.has(opt.key) && s.checkboxChecked]}>
                    {selectedExpenses.has(opt.key) && <Text style={s.checkmark}>✓</Text>}
                  </View>
                  <Text style={s.expenseLabel}>{opt.label}</Text>
                </TouchableOpacity>
                {selectedExpenses.has(opt.key) && (
                  <TextInput
                    style={s.expenseInput}
                    value={expenseValues[opt.key]}
                    onChangeText={t => setExpenseValues(p => ({ ...p, [opt.key]: fmt(t) }))}
                    placeholder="Enter amount"
                    keyboardType="numeric"
                  />
                )}
              </View>
            ))}
          </View>

          {/* Intercity */}
          <View style={s.card}>
            <Text style={s.label}>Intercity Deal? *</Text>
            <TouchableOpacity style={s.dropdown} onPress={() => setShowIntercityDD(!showIntercityDD)}>
              <Text style={s.dropdownText}>{intercityDeals}</Text>
              <Text style={s.dropdownArrow}>{showIntercityDD ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {showIntercityDD && (
              <View style={s.dropdownMenu}>
                {['Yes', 'No'].map(opt => (
                  <TouchableOpacity
                    key={opt}
                    style={s.dropdownItem}
                    onPress={() => {
                      setIntercityDeals(opt);
                      setShowIntercityDD(false);
                      if (opt === 'No') { setSelectedCity(''); setCustomCity(''); }
                    }}
                  >
                    <Text style={[s.dropdownItemText, intercityDeals === opt && s.selectedText]}>{opt}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {intercityDeals === 'Yes' && (
            <View style={s.card}>
              <Text style={s.label}>Select City *</Text>
              <TouchableOpacity style={s.dropdown} onPress={() => setShowCityDD(!showCityDD)}>
                <Text style={s.dropdownText}>{selectedCity || 'Select a city'}</Text>
                <Text style={s.dropdownArrow}>{showCityDD ? '▲' : '▼'}</Text>
              </TouchableOpacity>
              {showCityDD && (
                <View style={s.dropdownMenu}>
                  {INTERCITY_CITIES.map(city => (
                    <TouchableOpacity
                      key={city}
                      style={s.dropdownItem}
                      onPress={() => {
                        setSelectedCity(city);
                        setShowCityDD(false);
                        if (city !== 'Other') setCustomCity('');
                      }}
                    >
                      <Text style={[s.dropdownItemText, selectedCity === city && s.selectedText]}>{city}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              {selectedCity === 'Other' && (
                <TextInput
                  style={[s.input, { marginTop: spacing.md }]}
                  value={customCity}
                  onChangeText={setCustomCity}
                  placeholder="Enter city name"
                />
              )}
            </View>
          )}

          <LinearGradient
            colors={['#075E54', '#075E54']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={s.continueButton}
          >
            <TouchableOpacity
              onPress={() => { if (validateForm()) setShowCalculation(true); }}
              style={s.gradientTouchable}
              activeOpacity={0.8}
            >
              <Text style={s.continueButtonText}>Continue to Review</Text>
            </TouchableOpacity>
          </LinearGradient>
          <View style={{ height: 100 }} />
        </ScrollView>
      </View>
    );
  }

  // ─── No incentive (canCreate=false) ─────────────────────────────────────────
  if (!incentiveData) {
    return (
      <View style={s.container}>
        {!hideHeader && <HeaderBar title="Incentive Checklist" onPressBack={onBack} />}
        <View style={s.emptyContainer}>
          <Text style={s.emptyText}>Incentive not yet created for this lead</Text>
        </View>
      </View>
    );
  }

  // ─── Main detail view ────────────────────────────────────────────────────────
  return (
    <View style={s.container}>
      {!hideHeader && <HeaderBar title="Incentive Checklist" onPressBack={onBack} />}
      <ScrollView style={s.scrollView} showsVerticalScrollIndicator={false}>

        {/* ── Status card ── */}
        <View style={s.card}>
          <View style={s.statusHeader}>
            <Text style={s.cardTitle}>Lead: {leadName}</Text>
            <View style={[s.statusBadge, { backgroundColor: getStatusColor(incentiveData.status) }]}>
              <Text style={s.statusText}>{getStatusText(incentiveData.status)}</Text>
            </View>
          </View>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>Created:</Text>
            <Text style={s.infoValue}>{formatDate(incentiveData.created_at)}</Text>
          </View>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>Last Updated:</Text>
            <Text style={s.infoValue}>{formatDate(incentiveData.updated_at)}</Text>
          </View>
        </View>

        {/* ── Transaction details (shared for all BDT users) ── */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Transaction Details</Text>
          <View style={[s.infoRow, s.dividerRow]}>
            <Text style={s.infoLabel}>Gross Income:</Text>
            <Text style={s.infoValue}>{formatCurrency(incentiveData.gross_income_recieved)}</Text>
          </View>
          {incentiveData.referral_amt > 0 && (
            <View style={[s.infoRow, s.dividerRow]}>
              <Text style={s.infoLabel}>Referral Amount:</Text>
              <Text style={s.infoValue}>{formatCurrency(incentiveData.referral_amt)}</Text>
            </View>
          )}
          {incentiveData.goodwill > 0 && (
            <View style={[s.infoRow, s.dividerRow]}>
              <Text style={s.infoLabel}>Goodwill:</Text>
              <Text style={s.infoValue}>{formatCurrency(incentiveData.goodwill)}</Text>
            </View>
          )}
          {incentiveData.bdt_expenses > 0 && (
            <View style={[s.infoRow, s.dividerRow]}>
              <Text style={s.infoLabel}>BD Expenses:</Text>
              <Text style={s.infoValue}>{formatCurrency(incentiveData.bdt_expenses)}</Text>
            </View>
          )}
          <View style={[s.infoRow, s.dividerRow]}>
            <Text style={s.infoLabel}>Deal Type:</Text>
            <View style={incentiveData.intercity_deals ? s.badgeYes : s.badgeNo}>
              <Text style={incentiveData.intercity_deals ? s.badgeTextYes : s.badgeTextNo}>
                {incentiveData.intercity_deals ? 'Intercity' : 'Local'}
              </Text>
            </View>
          </View>
          {incentiveData.city && (
            <View style={s.infoRow}>
              <Text style={s.infoLabel}>City:</Text>
              <Text style={s.infoValue}>{incentiveData.city}</Text>
            </View>
          )}
        </View>

        {/* ── Earnings breakdown — uses my_share for per-user data ── */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Earnings Breakdown</Text>

          {/* Shared calculations */}
          <View style={s.calculationRow}>
            <Text style={s.calculationLabel}>Brokerage Amount (Gross)</Text>
            <Text style={s.calculationValue}>{formatCurrency(incentiveData.gross_income_recieved)}</Text>
          </View>
          {incentiveData.referral_amt > 0 && (
            <View style={s.calculationRow}>
              <Text style={s.calculationLabel}>Less: Referral Fee</Text>
              <Text style={[s.calculationValue, s.negativeValue]}>- {formatCurrency(incentiveData.referral_amt)}</Text>
            </View>
          )}
          {incentiveData.bdt_expenses > 0 && (
            <View style={s.calculationRow}>
              <Text style={s.calculationLabel}>Less: BD Expenses</Text>
              <Text style={[s.calculationValue, s.negativeValue]}>- {formatCurrency(incentiveData.bdt_expenses)}</Text>
            </View>
          )}
          {incentiveData.goodwill > 0 && (
            <View style={s.calculationRow}>
              <Text style={s.calculationLabel}>Less: Goodwill</Text>
              <Text style={[s.calculationValue, s.negativeValue]}>- {formatCurrency(incentiveData.goodwill)}</Text>
            </View>
          )}
          <View style={[s.calculationRow, s.highlightRow]}>
            <Text style={s.calculationLabelBold}>Net Company Earnings</Text>
            <Text style={s.calculationValueBold}>{formatCurrency(incentiveData.net_company_earning)}</Text>
          </View>
          {incentiveData.intercity_deals && (
            <View style={s.calculationRow}>
              <Text style={s.calculationLabel}>Intercity Share (50%)</Text>
              <Text style={s.calculationValue}>{formatCurrency(incentiveData.intercity_amount)}</Text>
            </View>
          )}

          {/* ── Per-user share — THE KEY CHANGE ────────────────────────────
              Uses incentiveData.my_share (the backend now returns only this
              user's allocation, not the aggregate bdt_share).
              ──────────────────────────────────────────────────────────── */}
          <MyShareSection share={incentiveData.my_share} />
        </View>

        {/* ── Remarks ── */}
        {incentiveData.remarks.length > 0 && (
          <View style={s.card}>
            <Text style={s.cardTitle}>Remarks ({incentiveData.remarks.length})</Text>
            {incentiveData.remarks.map((r, i) => (
              <View key={i} style={s.remarkItem}>
                <View style={s.remarkHeader}>
                  <Text style={s.remarkAuthor}>{r.username}</Text>
                  <Text style={s.remarkDate}>{formatDate(r.created_at)}</Text>
                </View>
                <Text style={s.remarkText}>{r.remark}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Add remark (correction status) ── */}
        {incentiveData.status === 'correction' && (
          <View style={s.card}>
            <Text style={s.cardTitle}>Add Remark</Text>
            <TextInput
              style={s.remarkInput}
              value={newRemark}
              onChangeText={setNewRemark}
              placeholder="Enter your remark..."
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <TouchableOpacity
              style={[s.submitButton, { backgroundColor: colors.success }, addingRemark && s.disabledBtn]}
              onPress={addRemark}
              disabled={addingRemark}
            >
              {addingRemark
                ? <ActivityIndicator color={colors.white} size="small" />
                : <Text style={s.submitBtnText}>Add Remark</Text>
              }
            </TouchableOpacity>
          </View>
        )}

        {/* ── Action buttons ── */}
        {incentiveData.status === 'correction' && (
          <TouchableOpacity style={s.acceptButton} onPress={acceptIncentive}>
            <Text style={s.acceptButtonText}>Accept Incentive</Text>
          </TouchableOpacity>
        )}
        {incentiveData.status === 'payment_raised' && (
          <TouchableOpacity style={s.acceptButton} onPress={acceptPaymentConfirmation}>
            <Text style={s.acceptButtonText}>Accept Payment Confirmation</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container:         { flex: 1, backgroundColor: colors.primary },
  header:            { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: colors.primary, marginTop: 45 },
  headerWithGreen:   { backgroundColor: 'transparent', position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
  greenHeader:       { paddingTop: 80, paddingBottom: 20, paddingHorizontal: spacing.lg },
  greenHeaderContent:{ marginTop: 17 },
  backButton:        { padding: spacing.sm, borderRadius: borderRadius.sm },
  backIcon:          { height: 24, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
  backArrow:         { width: 12, height: 12, borderLeftWidth: 2, borderTopWidth: 2, borderColor: colors.white, transform: [{ rotate: '-45deg' }] },
  backText:          { color: '#fff', fontSize: 16, marginLeft: 2 },
  headerTitle:       { fontWeight: '600', color: colors.white, flex: 1, textAlign: 'center', fontSize: 20 },
  headerSpacer:      { width: 40 },
  scrollView:        { flex: 1, backgroundColor: colors.backgroundSecondary },
  card:              { backgroundColor: colors.white, marginHorizontal: spacing.lg, marginTop: spacing.lg, padding: spacing.lg, borderRadius: borderRadius.xl, ...shadows.md },
  reviewTitle:       { fontSize: fontSize.xl, fontWeight: '700', color: colors.primary, marginBottom: spacing.xs },
  sectionTitle:      { fontSize: fontSize.xl, fontWeight: '700', color: colors.primary, marginBottom: spacing.xs },
  leadName:          { fontSize: fontSize.md, color: colors.textSecondary, fontWeight: '500' },
  leadNameLarge:     { fontSize: fontSize.lg, color: colors.text, fontWeight: '600' },
  cardTitle:         { fontSize: fontSize.lg, fontWeight: '600', color: colors.text, marginBottom: spacing.md },
  statusHeader:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  statusBadge:       { marginTop: -15, paddingHorizontal: spacing.sm, paddingVertical: spacing.sm, borderRadius: borderRadius.lg },
  statusText:        { color: colors.white, fontSize: 12, fontWeight: '600' },
  label:             { fontSize: fontSize.sm, fontWeight: '600', color: colors.text, marginBottom: spacing.sm },
  input:             { borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.md, fontSize: fontSize.md, color: colors.text, backgroundColor: colors.white },
  expenseInfoText:   { fontSize: fontSize.sm, color: colors.textSecondary, marginBottom: spacing.md, fontStyle: 'italic' },
  expenseItem:       { marginBottom: spacing.md, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  checkboxContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  checkbox:          { width: 20, height: 20, borderWidth: 2, borderColor: colors.border, borderRadius: borderRadius.sm, alignItems: 'center', justifyContent: 'center', marginRight: spacing.sm },
  checkboxChecked:   { borderColor: colors.primary, backgroundColor: colors.primary },
  checkmark:         { color: colors.white, fontSize: fontSize.md, fontWeight: '700' },
  expenseLabel:      { fontSize: fontSize.md, color: colors.text, fontWeight: '500' },
  expenseInput:      { borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.md, fontSize: fontSize.md, color: colors.text, backgroundColor: colors.backgroundSecondary, marginTop: spacing.xs },
  dropdown:          { borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.white },
  dropdownText:      { fontSize: fontSize.md, color: colors.text, fontWeight: '500' },
  dropdownArrow:     { fontSize: fontSize.sm, color: colors.textSecondary },
  dropdownMenu:      { marginTop: spacing.xs, borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.lg, backgroundColor: colors.white, ...shadows.sm },
  dropdownItem:      { paddingHorizontal: spacing.md, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  dropdownItemText:  { fontSize: fontSize.md, color: colors.text },
  selectedText:      { color: colors.primary, fontWeight: '600' },
  summaryGrid:       { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: colors.backgroundSecondary, borderRadius: borderRadius.lg, padding: spacing.md, marginBottom: spacing.md },
  summaryItem:       { flex: 1, alignItems: 'center' },
  summaryLabel:      { fontSize: fontSize.sm, color: colors.textSecondary, marginBottom: spacing.xs },
  summaryValue:      { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  expenseSummaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  badgeYes:          { backgroundColor: colors.success + '20', paddingVertical: spacing.xs, paddingHorizontal: spacing.md, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.success },
  badgeNo:           { backgroundColor: colors.textSecondary + '20', paddingVertical: spacing.xs, paddingHorizontal: spacing.md, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.textSecondary },
  badgeTextYes:      { fontSize: fontSize.sm, fontWeight: '600', color: colors.success },
  badgeTextNo:       { fontSize: fontSize.sm, fontWeight: '600', color: colors.textSecondary },
  calculationRow:    { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  dividerRow:        { borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: spacing.sm },
  calculationLabel:  { fontSize: fontSize.sm, color: colors.textSecondary, flex: 1 },
  calculationValue:  { fontSize: fontSize.sm, color: colors.text, fontWeight: '500' },
  negativeValue:     { color: colors.error },
  highlightRow:      { backgroundColor: colors.info + '10', paddingHorizontal: spacing.sm, borderRadius: borderRadius.sm, marginVertical: spacing.xs },
  calculationLabelBold: { fontSize: fontSize.sm, color: colors.text, fontWeight: '600', flex: 1 },
  calculationValueBold: { fontSize: fontSize.sm, color: colors.text, fontWeight: '700' },
  finalRow:          { backgroundColor: colors.success + '15', paddingHorizontal: spacing.sm, paddingVertical: spacing.md, borderRadius: borderRadius.lg, marginTop: spacing.md, borderWidth: 2, borderColor: colors.success },
  finalLabel:        { fontSize: fontSize.md, color: colors.success, fontWeight: '700', flex: 1 },
  finalValue:        { fontSize: fontSize.xl, color: colors.success, fontWeight: '700' },
  pendingBupBox:     { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginTop: spacing.md, padding: spacing.md, backgroundColor: colors.warning + '15', borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.warning },
  pendingBupIcon:    { fontSize: 20 },
  pendingBupTitle:   { fontSize: fontSize.sm, fontWeight: '700', color: colors.warning, marginBottom: 2 },
  pendingBupSubtext: { fontSize: fontSize.xs, color: colors.text, lineHeight: 16 },
  infoCard:          { backgroundColor: colors.info + '15', marginHorizontal: spacing.lg, marginTop: spacing.lg, padding: spacing.lg, borderRadius: borderRadius.xl, borderWidth: 1, borderColor: colors.info },
  infoCardTitle:     { fontSize: fontSize.md, fontWeight: '600', color: colors.info, marginBottom: spacing.xs },
  infoCardText:      { fontSize: fontSize.sm, color: colors.text, lineHeight: 20 },
  continueButton:    { paddingVertical: 14, paddingHorizontal: 16, borderRadius: borderRadius.lg, alignItems: 'center', marginHorizontal: spacing.lg, marginTop: spacing.lg, ...shadows.md },
  gradientTouchable: { width: '100%', alignItems: 'center', paddingVertical: 16 },
  continueButtonText:{ color: colors.white, fontSize: fontSize.md, fontWeight: '600' },
  submitButton:      { paddingVertical: spacing.md, paddingHorizontal: spacing.lg, borderRadius: borderRadius.lg, alignItems: 'center', marginHorizontal: spacing.lg, marginTop: spacing.lg, ...shadows.md, minHeight: 50 },
  submitBtnTouchable:{ width: '100%', alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.md },
  submitBtnText:     { color: colors.white, fontSize: fontSize.md, fontWeight: '600' },
  disabledBtn:       { opacity: 0.7 },
  acceptButton:      { backgroundColor: colors.success, paddingVertical: spacing.md, paddingHorizontal: spacing.lg, borderRadius: borderRadius.lg, alignItems: 'center', marginHorizontal: spacing.lg, marginTop: spacing.lg, ...shadows.md },
  acceptButtonText:  { color: colors.white, fontSize: fontSize.md, fontWeight: '600' },
  infoRow:           { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.xs },
  infoLabel:         { fontSize: fontSize.sm, color: colors.textSecondary },
  infoValue:         { fontSize: fontSize.sm, color: colors.text, fontWeight: '500' },
  remarkItem:        { backgroundColor: colors.backgroundSecondary, padding: spacing.md, borderRadius: borderRadius.md, marginBottom: spacing.sm },
  remarkHeader:      { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs },
  remarkAuthor:      { fontSize: fontSize.sm, color: colors.text, fontWeight: '600' },
  remarkDate:        { fontSize: fontSize.xs, color: colors.textSecondary },
  remarkText:        { fontSize: fontSize.sm, color: colors.text, lineHeight: 20 },
  remarkInput:       { borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.lg, padding: spacing.md, backgroundColor: colors.white, fontSize: fontSize.sm, color: colors.text, marginBottom: spacing.md, textAlignVertical: 'top', minHeight: 100 },
  loadingContainer:  { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.backgroundSecondary },
  loadingText:       { marginTop: spacing.md, color: colors.textSecondary, fontSize: fontSize.md },
  emptyContainer:    { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.backgroundSecondary, paddingHorizontal: spacing.lg },
  emptyText:         { color: colors.textSecondary, fontSize: fontSize.md, textAlign: 'center' },
});

export default Incentive;