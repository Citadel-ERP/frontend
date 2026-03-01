// bdt incentive — works with per-user share status from updated backend.
// Backend returns `incentive.my_share` with:
//   { bdt_share, tds_deducted, final_amount_payable,
//     user_status, payment_confirmed_by_bdt, payment_sent_by_bup }
//
// KEY CHANGES vs previous version:
//  - All action buttons gate on my_share.user_status (per-user), NOT incentiveData.status
//  - Status badge shows my_share.user_status label
//  - Add remark shown only when my_share.user_status === 'correction'
//  - Accept incentive shown when user_status is 'pending' (share set) OR 'correction'
//  - Accept payment shown only when user_status === 'payment_confirmation'
//  - Referral removed from create form; always sends referral_amt: 0 to backend

import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  StatusBar, Alert, TextInput, ActivityIndicator,
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
  canCreate?: boolean;
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
 * Per-user share returned by the backend for the requesting BDT user.
 * user_status is the source of truth for all action gating.
 */
interface MyShare {
  bdt_share: number | null;
  tds_deducted: number | null;
  final_amount_payable: number | null;
  user_status:
    | 'pending'
    | 'correction'
    | 'accepted_by_bdt'
    | 'accepted'
    | 'payment_confirmation'
    | 'completed';
  payment_confirmed_by_bdt: boolean;
  payment_sent_by_bup: boolean;
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
  tds_deducted: number | null;
  net_company_earning: number | null;
  bdt_share: number | null;
  less_tax: number | null;
  final_amount_payable: number | null;
  /** Top-level aggregate status — display context only. Actions use my_share.user_status */
  status: string;
  remarks: Remark[];
  city?: string;
  my_share: MyShare | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────
// Referral removed — BUP handles referral, not BDT
const INTERCITY_CITIES = [
  'Bangalore', 'Chennai', 'Hyderabad', 'Mumbai', 'NCR', 'Pune', 'Other',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const hasValue = (v: number | null | undefined): boolean =>
  v !== null && v !== undefined && v !== 0;

const shareIsSet = (share: MyShare | null | undefined): boolean =>
  share != null && hasValue(share.bdt_share);

// ─── Component ────────────────────────────────────────────────────────────────
const Incentive: React.FC<IncentiveProps> = ({
  onBack,
  leadId,
  leadName,
  hideHeader,
  canCreate = false,
  onIncentiveCreated,
}) => {
  const [token, setToken]                     = useState<string | null>(null);
  const [loading, setLoading]                 = useState(false);
  const [incentiveData, setIncentiveData]     = useState<IncentiveData | null>(null);
  const [isCreateMode, setIsCreateMode]       = useState(false);
  const [showCalculation, setShowCalculation] = useState(false);
  const [newRemark, setNewRemark]             = useState('');
  const [addingRemark, setAddingRemark]       = useState(false);
  const [accepting, setAccepting]             = useState(false);
  const [confirmingPayment, setConfirmingPayment] = useState(false);

  // Create-form state — no referral field; BUP sets it
  const [grossIncome, setGrossIncome]         = useState('');
  const [bdExpenses, setBdExpenses]           = useState('');
  const [hasBdExpenses, setHasBdExpenses]     = useState(false);
  const [intercityDeals, setIntercityDeals]   = useState('No');
  const [showIntercityDD, setShowIntercityDD] = useState(false);
  const [selectedCity, setSelectedCity]       = useState('');
  const [showCityDD, setShowCityDD]           = useState(false);
  const [customCity, setCustomCity]           = useState('');

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
        canCreate ? setIsCreateMode(true) : setIncentiveData(null);
        return;
      }
      const data = await res.json();
      if (res.ok) {
        const inc: IncentiveData = data.incentive;
        setIncentiveData(inc);
        setIsCreateMode(false);
        // Pre-fill form
        setGrossIncome(fmt(inc.gross_income_recieved.toString()));
        if (inc.bdt_expenses > 0) {
          setHasBdExpenses(true);
          setBdExpenses(fmt(inc.bdt_expenses.toString()));
        }
        setIntercityDeals(inc.intercity_deals ? 'Yes' : 'No');
        if (inc.city) setSelectedCity(inc.city);
      } else {
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

  // ── Calculate from form (referral always 0 — BUP sets it) ─────────────────
  const calcFromForm = () => {
    const gross       = parseFloat(parse(grossIncome)) || 0;
    const bdExp       = hasBdExpenses && bdExpenses ? parseFloat(parse(bdExpenses)) : 0;
    const netEarning  = gross - bdExp;
    const isIntercity = intercityDeals === 'Yes';
    const intercityAmount = isIntercity ? netEarning * 0.5 : netEarning;
    return { gross, bdExp, netEarning, intercityAmount };
  };

  // ── Validate create form ───────────────────────────────────────────────────
  const validateForm = (): boolean => {
    if (!grossIncome) { Alert.alert('Error', 'Please enter gross income'); return false; }
    if (hasBdExpenses && !bdExpenses) { Alert.alert('Error', 'Please enter BD expenses amount'); return false; }
    if (intercityDeals === 'Yes' && !selectedCity) { Alert.alert('Error', 'Please select a city'); return false; }
    if (selectedCity === 'Other' && !customCity.trim()) { Alert.alert('Error', 'Please enter city name'); return false; }
    return true;
  };

  // ── Create incentive ───────────────────────────────────────────────────────
  const createIncentive = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const c           = calcFromForm();
      const isIntercity = intercityDeals === 'Yes';
      const cityToSend  = selectedCity === 'Other' ? customCity : selectedCity;
      const res = await fetch(`${BACKEND_URL}/employee/createIncentive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          lead_id:               leadId,
          gross_income_recieved: parse(grossIncome),
          referral_amt:          0,           // BUP handles referral — always 0 from BDT
          bdt_expenses:          hasBdExpenses && bdExpenses ? parse(bdExpenses) : 0,
          goodwill:              0,
          intercity_deals:       isIntercity,
          intercity_amount:      c.intercityAmount,
          net_company_earning:   c.netEarning,
          bdt_share:             null,
          tds_deducted:          null,
          less_tax:              null,
          final_amount_payable:  null,
          city:                  isIntercity ? cityToSend : null,
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

  // ── Add remark — only when my_share.user_status === 'correction' ──────────
  const addRemark = async () => {
    if (!token || !newRemark.trim()) { Alert.alert('Error', 'Please enter a remark'); return; }
    try {
      setAddingRemark(true);
      const res = await fetch(`${BACKEND_URL}/employee/addRemark`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, lead_id: leadId, remark: newRemark.trim() }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error((errData as any).message || 'Failed to add remark');
      }
      const data = await res.json();
      setIncentiveData(data.incentive);
      setNewRemark('');
      Alert.alert('Success', 'Remark added successfully!');
    } catch (err: any) {
      console.error('Error adding remark:', err);
      Alert.alert('Error', err.message || 'Failed to add remark. Please try again.');
    } finally {
      setAddingRemark(false);
    }
  };

  // ── Accept incentive — moves THIS user's user_status → 'accepted_by_bdt' ──
  const acceptIncentive = async () => {
    if (!token) return;
    Alert.alert(
      'Accept Incentive',
      'Confirm that you accept your share of this incentive?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          onPress: async () => {
            try {
              setAccepting(true);
              const res = await fetch(`${BACKEND_URL}/employee/acceptIncentive`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, lead_id: leadId }),
              });
              if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error((errData as any).message || 'Failed to accept incentive');
              }
              Alert.alert('Success', 'Incentive accepted! BUP has been notified.');
              fetchIncentive();
            } catch (err: any) {
              console.error('Error accepting incentive:', err);
              Alert.alert('Error', err.message || 'Failed to accept incentive.');
            } finally {
              setAccepting(false);
            }
          },
        },
      ]
    );
  };

  // ── Accept payment — marks THIS user's share as completed ──────────────────
  const acceptPaymentConfirmation = async () => {
    if (!token) return;
    Alert.alert(
      'Confirm Payment Received',
      'Confirm that you have received your payment for this incentive?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              setConfirmingPayment(true);
              const res = await fetch(`${BACKEND_URL}/employee/acceptPaymentConfirmation`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, lead_id: leadId }),
              });
              if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error((errData as any).message || 'Failed to confirm payment');
              }
              Alert.alert('Success', 'Payment confirmed! Your incentive is now complete.');
              fetchIncentive();
            } catch (err: any) {
              console.error('Error confirming payment:', err);
              Alert.alert('Error', err.message || 'Failed to confirm payment.');
            } finally {
              setConfirmingPayment(false);
            }
          },
        },
      ]
    );
  };

  // ── Derived — per-user status drives all conditional rendering ─────────────
  const myStatus  = incentiveData?.my_share?.user_status ?? null;
  const myShareSet = shareIsSet(incentiveData?.my_share);

  // ── Formatters ─────────────────────────────────────────────────────────────
  const formatDate = (ds: string) =>
    new Date(ds).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

  const formatCurrency = (amount: number | null): string => {
    if (amount === null || amount === undefined) return '₹0.00';
    return `₹${amount.toLocaleString('en-IN', {
      minimumFractionDigits: 2, maximumFractionDigits: 2,
    })}`;
  };

  const getMyStatusColor = (s: string): string => ({
    pending:              colors.warning,
    correction:           colors.error,
    accepted_by_bdt:      '#2196F3',
    accepted:             colors.success,
    payment_confirmation: '#9C27B0',
    completed:            colors.primary,
  }[s] ?? colors.textSecondary);

  const getMyStatusText = (s: string): string => ({
    pending:              'Awaiting BUP Review',
    correction:           'Needs Your Response',
    accepted_by_bdt:      'Awaiting BUP Acceptance',
    accepted:             'Accepted by BUP',
    payment_confirmation: 'Confirm Payment Receipt',
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
   * Shows this user's BUP-allocated share, or a pending notice.
   * Also shows payment pipeline indicators when relevant.
   */
  const MyShareSection = ({ share }: { share: MyShare | null | undefined }) => {
    if (!shareIsSet(share)) {
      return (
        <View style={s.pendingBupBox}>
          <Text style={s.pendingBupIcon}>⏳</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.pendingBupTitle}>Pending BUP Calculation</Text>
            <Text style={s.pendingBupSubtext}>
              Your Transaction Team Share, TDS & Final Amount will be set by the BUP team.
            </Text>
          </View>
        </View>
      );
    }

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
        {share!.payment_sent_by_bup && !share!.payment_confirmed_by_bdt && (
          <View style={s.paymentSentBox}>
            <Text style={s.paymentSentIcon}>💸</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.paymentSentTitle}>Payment Dispatched</Text>
              <Text style={s.paymentSentSubtext}>
                BUP has sent your payment. Please confirm receipt below.
              </Text>
            </View>
          </View>
        )}
        {share!.payment_confirmed_by_bdt && (
          <View style={s.paymentDoneBox}>
            <Text style={s.paymentDoneIcon}>✅</Text>
            <Text style={s.paymentDoneText}>Payment Received & Confirmed</Text>
          </View>
        )}
      </>
    );
  };

  // ─── Loading ────────────────────────────────────────────────────────────────
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

  // ─── Create mode: Review screen ──────────────────────────────────────────────
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
              <Text style={s.headerTitle}>Review & Submit</Text>
              <View style={s.headerSpacer} />
            </View>
          </>
        )}
        <ScrollView style={s.scrollView} showsVerticalScrollIndicator={false}>
          <View style={s.card}>
            <Text style={s.reviewTitle}>Review Details</Text>
            <Text style={s.leadName}>Lead: {leadName}</Text>
          </View>

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

          {c.bdExp > 0 && (
            <View style={s.card}>
              <Text style={s.cardTitle}>Expenses</Text>
              <View style={s.expenseSummaryRow}>
                <Text style={s.infoLabel}>BD Expenses</Text>
                <Text style={s.infoValue}>₹{c.bdExp.toLocaleString('en-IN')}</Text>
              </View>
            </View>
          )}

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

          <View style={s.infoCard}>
            <Text style={s.infoCardTitle}>📋 Important Note</Text>
            <Text style={s.infoCardText}>
              Your final earnings (Transaction Team Share & TDS) will be calculated by the BUP
              team. Referral amounts, if any, will also be set by BUP.
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

          {/* BD Expenses only — referral removed entirely */}
          <View style={s.card}>
            <Text style={s.label}>BD Expenses (Optional)</Text>
            <TouchableOpacity
              style={s.checkboxContainer}
              onPress={() => { setHasBdExpenses(!hasBdExpenses); if (hasBdExpenses) setBdExpenses(''); }}
            >
              <View style={[s.checkbox, hasBdExpenses && s.checkboxChecked]}>
                {hasBdExpenses && <Text style={s.checkmark}>✓</Text>}
              </View>
              <Text style={s.expenseLabel}>Include BD Expenses</Text>
            </TouchableOpacity>
            {hasBdExpenses && (
              <TextInput
                style={[s.input, { marginTop: spacing.sm }]}
                value={bdExpenses}
                onChangeText={t => setBdExpenses(fmt(t))}
                placeholder="Enter BD expenses amount"
                keyboardType="numeric"
              />
            )}
            <Text style={s.expenseInfoText}>
              Note: Referral amounts are set by the BUP team and don't need to be entered here.
            </Text>
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

        {/* ── Status card — badge shows MY per-user status ── */}
        <View style={s.card}>
          <View style={s.statusHeader}>
            <Text style={s.cardTitle}>Lead: {leadName}</Text>
            {myStatus && (
              <View style={[s.statusBadge, { backgroundColor: getMyStatusColor(myStatus) }]}>
                <Text style={s.statusText}>{getMyStatusText(myStatus)}</Text>
              </View>
            )}
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

        {/* ── Transaction details ── */}
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

        {/* ── Earnings breakdown — my_share for per-user figures ── */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Earnings Breakdown</Text>
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

        {/* ── Add remark — only when THIS user's share is in correction ── */}
        {myStatus === 'correction' && (
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
              style={[s.addRemarkButton, addingRemark && s.disabledBtn]}
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

        {/* ── Action buttons — ALL gated on my_share.user_status ── */}

        {/* Accept: BUP has set share AND this user is pending or in correction */}
        {myShareSet && (myStatus === 'pending' || myStatus === 'correction') && (
          <TouchableOpacity
            style={[s.acceptButton, accepting && s.disabledBtn]}
            onPress={acceptIncentive}
            disabled={accepting}
          >
            {accepting
              ? <ActivityIndicator color={colors.white} size="small" />
              : <Text style={s.acceptButtonText}>Accept My Incentive Share</Text>
            }
          </TouchableOpacity>
        )}

        {/* Confirm payment: only when BUP has sent payment for this specific user */}
        {myStatus === 'payment_confirmation' && (
          <TouchableOpacity
            style={[s.paymentButton, confirmingPayment && s.disabledBtn]}
            onPress={acceptPaymentConfirmation}
            disabled={confirmingPayment}
          >
            {confirmingPayment
              ? <ActivityIndicator color={colors.white} size="small" />
              : <Text style={s.acceptButtonText}>Confirm Payment Received</Text>
            }
          </TouchableOpacity>
        )}

        {/* Completed indicator */}
        {myStatus === 'completed' && (
          <View style={s.completedBanner}>
            <Text style={s.completedIcon}>🎉</Text>
            <Text style={s.completedText}>Your incentive is complete!</Text>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.primary },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: colors.primary, marginTop: 30 },
  headerWithGreen: { backgroundColor: 'transparent', position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
  greenHeader: { paddingTop: 80, paddingBottom: 20, paddingHorizontal: spacing.lg },
  greenHeaderContent: { marginTop: 0 },
  backButton: { padding: spacing.sm, borderRadius: borderRadius.sm },
  backIcon: { height: 24, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
  backArrow: { width: 12, height: 12, borderLeftWidth: 2, borderTopWidth: 2, borderColor: colors.white, transform: [{ rotate: '-45deg' }] },
  backText: { color: '#fff', fontSize: 16, marginLeft: 2 },
  headerTitle: { fontWeight: '600', color: colors.white, flex: 1, textAlign: 'center', fontSize: 20 },
  headerSpacer: { width: 40 },
  scrollView: { flex: 1, backgroundColor: colors.backgroundSecondary },
  card: { backgroundColor: colors.white, marginHorizontal: spacing.lg, marginTop: spacing.lg, padding: spacing.lg, borderRadius: borderRadius.xl, ...shadows.md },
  reviewTitle: { fontSize: fontSize.xl, fontWeight: '700', color: colors.primary, marginBottom: spacing.xs },
  sectionTitle: { fontSize: fontSize.xl, fontWeight: '700', color: colors.primary, marginBottom: spacing.xs },
  leadName: { fontSize: fontSize.md, color: colors.textSecondary, fontWeight: '500' },
  leadNameLarge: { fontSize: fontSize.lg, color: colors.text, fontWeight: '600' },
  cardTitle: { fontSize: fontSize.lg, fontWeight: '600', color: colors.text, marginBottom: spacing.md },
  statusHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  statusBadge: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: borderRadius.lg },
  statusText: { color: colors.white, fontSize: 11, fontWeight: '600' },
  label: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text, marginBottom: spacing.sm },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.md, fontSize: fontSize.md, color: colors.text, backgroundColor: colors.white },
  expenseInfoText: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: spacing.sm, fontStyle: 'italic' },
  checkboxContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  checkbox: { width: 20, height: 20, borderWidth: 2, borderColor: colors.border, borderRadius: borderRadius.sm, alignItems: 'center', justifyContent: 'center', marginRight: spacing.sm },
  checkboxChecked: { borderColor: colors.primary, backgroundColor: colors.primary },
  checkmark: { color: colors.white, fontSize: fontSize.md, fontWeight: '700' },
  expenseLabel: { fontSize: fontSize.md, color: colors.text, fontWeight: '500' },
  dropdown: { borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.white },
  dropdownText: { fontSize: fontSize.md, color: colors.text, fontWeight: '500' },
  dropdownArrow: { fontSize: fontSize.sm, color: colors.textSecondary },
  dropdownMenu: { marginTop: spacing.xs, borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.lg, backgroundColor: colors.white, ...shadows.sm },
  dropdownItem: { paddingHorizontal: spacing.md, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  dropdownItemText: { fontSize: fontSize.md, color: colors.text },
  selectedText: { color: colors.primary, fontWeight: '600' },
  summaryGrid: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: colors.backgroundSecondary, borderRadius: borderRadius.lg, padding: spacing.md, marginBottom: spacing.md },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryLabel: { fontSize: fontSize.sm, color: colors.textSecondary, marginBottom: spacing.xs },
  summaryValue: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  expenseSummaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  badgeYes: { backgroundColor: colors.success + '20', paddingVertical: spacing.xs, paddingHorizontal: spacing.md, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.success },
  badgeNo: { backgroundColor: colors.textSecondary + '20', paddingVertical: spacing.xs, paddingHorizontal: spacing.md, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.textSecondary },
  badgeTextYes: { fontSize: fontSize.sm, fontWeight: '600', color: colors.success },
  badgeTextNo: { fontSize: fontSize.sm, fontWeight: '600', color: colors.textSecondary },
  calculationRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  dividerRow: { borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: spacing.sm },
  calculationLabel: { fontSize: fontSize.sm, color: colors.textSecondary, flex: 1 },
  calculationValue: { fontSize: fontSize.sm, color: colors.text, fontWeight: '500' },
  negativeValue: { color: colors.error },
  highlightRow: { backgroundColor: colors.info + '10', paddingHorizontal: spacing.sm, borderRadius: borderRadius.sm, marginVertical: spacing.xs },
  calculationLabelBold: { fontSize: fontSize.sm, color: colors.text, fontWeight: '600', flex: 1 },
  calculationValueBold: { fontSize: fontSize.sm, color: colors.text, fontWeight: '700' },
  finalRow: { backgroundColor: colors.success + '15', paddingHorizontal: spacing.sm, paddingVertical: spacing.md, borderRadius: borderRadius.lg, marginTop: spacing.md, borderWidth: 2, borderColor: colors.success },
  finalLabel: { fontSize: fontSize.md, color: colors.success, fontWeight: '700', flex: 1 },
  finalValue: { fontSize: fontSize.xl, color: colors.success, fontWeight: '700' },
  pendingBupBox: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginTop: spacing.md, padding: spacing.md, backgroundColor: colors.warning + '15', borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.warning },
  pendingBupIcon: { fontSize: 20 },
  pendingBupTitle: { fontSize: fontSize.sm, fontWeight: '700', color: colors.warning, marginBottom: 2 },
  pendingBupSubtext: { fontSize: fontSize.xs, color: colors.text, lineHeight: 16 },
  paymentSentBox: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginTop: spacing.md, padding: spacing.md, backgroundColor: '#9C27B015', borderRadius: borderRadius.lg, borderWidth: 1, borderColor: '#9C27B0' },
  paymentSentIcon: { fontSize: 20 },
  paymentSentTitle: { fontSize: fontSize.sm, fontWeight: '700', color: '#9C27B0', marginBottom: 2 },
  paymentSentSubtext: { fontSize: fontSize.xs, color: colors.text, lineHeight: 16 },
  paymentDoneBox: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md, padding: spacing.md, backgroundColor: colors.success + '15', borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.success },
  paymentDoneIcon: { fontSize: 18 },
  paymentDoneText: { fontSize: fontSize.sm, fontWeight: '700', color: colors.success },
  infoCard: { backgroundColor: colors.info + '15', marginHorizontal: spacing.lg, marginTop: spacing.lg, padding: spacing.lg, borderRadius: borderRadius.xl, borderWidth: 1, borderColor: colors.info },
  infoCardTitle: { fontSize: fontSize.md, fontWeight: '600', color: colors.info, marginBottom: spacing.xs },
  infoCardText: { fontSize: fontSize.sm, color: colors.text, lineHeight: 20 },
  continueButton: { paddingVertical: 14, paddingHorizontal: 16, borderRadius: borderRadius.lg, alignItems: 'center', marginHorizontal: spacing.lg, marginTop: spacing.lg, ...shadows.md },
  gradientTouchable: { width: '100%', alignItems: 'center', paddingVertical: 16 },
  continueButtonText: { color: colors.white, fontSize: fontSize.md, fontWeight: '600' },
  submitButton: { borderRadius: borderRadius.lg, alignItems: 'center', marginHorizontal: spacing.lg, marginTop: spacing.lg, ...shadows.md, overflow: 'hidden' },
  submitBtnTouchable: { width: '100%', alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.lg },
  submitBtnText: { color: colors.white, fontSize: fontSize.md, fontWeight: '600' },
  disabledBtn: { opacity: 0.6 },
  addRemarkButton: { backgroundColor: colors.success, paddingVertical: spacing.md, borderRadius: borderRadius.lg, alignItems: 'center', marginTop: spacing.sm, minHeight: 48, justifyContent: 'center' },
  acceptButton: { backgroundColor: colors.success, paddingVertical: spacing.md, paddingHorizontal: spacing.lg, borderRadius: borderRadius.lg, alignItems: 'center', marginHorizontal: spacing.lg, marginTop: spacing.lg, ...shadows.md, minHeight: 50, justifyContent: 'center' },
  paymentButton: { backgroundColor: '#9C27B0', paddingVertical: spacing.md, paddingHorizontal: spacing.lg, borderRadius: borderRadius.lg, alignItems: 'center', marginHorizontal: spacing.lg, marginTop: spacing.lg, ...shadows.md, minHeight: 50, justifyContent: 'center' },
  acceptButtonText: { color: colors.white, fontSize: fontSize.md, fontWeight: '600' },
  completedBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.success + '20', marginHorizontal: spacing.lg, marginTop: spacing.lg, padding: spacing.lg, borderRadius: borderRadius.xl, borderWidth: 1, borderColor: colors.success },
  completedIcon: { fontSize: 22 },
  completedText: { fontSize: fontSize.md, fontWeight: '700', color: colors.success },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.xs },
  infoLabel: { fontSize: fontSize.sm, color: colors.textSecondary },
  infoValue: { fontSize: fontSize.sm, color: colors.text, fontWeight: '500' },
  remarkItem: { backgroundColor: colors.backgroundSecondary, padding: spacing.md, borderRadius: borderRadius.md, marginBottom: spacing.sm },
  remarkHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs },
  remarkAuthor: { fontSize: fontSize.sm, color: colors.text, fontWeight: '600' },
  remarkDate: { fontSize: fontSize.xs, color: colors.textSecondary },
  remarkText: { fontSize: fontSize.sm, color: colors.text, lineHeight: 20 },
  remarkInput: { borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.lg, padding: spacing.md, backgroundColor: colors.white, fontSize: fontSize.sm, color: colors.text, marginBottom: spacing.md, textAlignVertical: 'top', minHeight: 100 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.backgroundSecondary },
  loadingText: { marginTop: spacing.md, color: colors.textSecondary, fontSize: fontSize.md },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.backgroundSecondary, paddingHorizontal: spacing.lg },
  emptyText: { color: colors.textSecondary, fontSize: fontSize.md, textAlign: 'center' },
});

export default Incentive;