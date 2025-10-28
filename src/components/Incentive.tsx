import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView,
  StatusBar, Alert, TextInput, ActivityIndicator, Modal
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, borderRadius, shadows } from '../styles/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BACKEND_URL } from '../config/config';

const TOKEN_KEY = 'token_2';

interface IncentiveProps {
  onBack: () => void;
  leadId: number;
  leadName: string;
}

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
  status: 'pending' | 'correction' | 'accepted' | 'payment_raised' | 'paid';
  remarks: Remark[];
}

const Incentive: React.FC<IncentiveProps> = ({ onBack, leadId, leadName }) => {
  const insets = useSafeAreaInsets();
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [incentiveData, setIncentiveData] = useState<IncentiveData | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [newRemark, setNewRemark] = useState('');
  const [addingRemark, setAddingRemark] = useState(false);

  const [grossIncome, setGrossIncome] = useState('');
  const [referralAmt, setReferralAmt] = useState('');
  const [bdtExpenses, setBdtExpenses] = useState('');
  const [goodwill, setGoodwill] = useState('');
  const [intercityDeals, setIntercityDeals] = useState(false);
  const [bdtSharePercentage, setBdtSharePercentage] = useState('7');

  useEffect(() => {
    const getToken = async () => {
      try {
        const API_TOKEN = await AsyncStorage.getItem(TOKEN_KEY);
        setToken(API_TOKEN);
      } catch (error) {
        console.error('Error getting token:', error);
      }
    };
    getToken();
  }, []);

  useEffect(() => {
    if (token) {
      fetchIncentive();
    }
  }, [token]);

  const fetchIncentive = async () => {
    try {
      if (!token) return;
      setLoading(true);

      const response = await fetch(`${BACKEND_URL}/employee/getIncentive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, lead_id: leadId })
      });

      if (response.ok) {
        const data = await response.json();
        setIncentiveData(data.incentive);
        setGrossIncome(data.incentive.gross_income_recieved.toString());
        setReferralAmt(data.incentive.referral_amt.toString());
        setBdtExpenses(data.incentive.bdt_expenses.toString());
        setGoodwill(data.incentive.goodwill.toString());
        setIntercityDeals(data.incentive.intercity_deals);
      } else {
        const errorData = await response.json();
        if (errorData.message?.includes('already paid')) {
          Alert.alert('Notice', 'This incentive has been paid and is no longer visible.');
          onBack();
        } else {
          setIsEditMode(true);
        }
      }
    } catch (error) {
      console.error('Error fetching incentive:', error);
      setIsEditMode(true);
    } finally {
      setLoading(false);
    }
  };

  const createIncentive = async () => {
    try {
      if (!token) return;

      if (!grossIncome || !referralAmt || !bdtExpenses || !goodwill) {
        Alert.alert('Error', 'Please fill all required fields');
        return;
      }

      setLoading(true);

      const response = await fetch(`${BACKEND_URL}/employee/createIncentive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          lead_id: leadId,
          gross_income_recieved: grossIncome,
          referral_amt: referralAmt,
          bdt_expenses: bdtExpenses,
          goodwill: goodwill,
          intercity_deals: intercityDeals
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create incentive');
      }

      const data = await response.json();
      setIncentiveData(data.incentive);
      setIsEditMode(false);
      Alert.alert('Success', 'Incentive created successfully!');
    } catch (error) {
      console.error('Error creating incentive:', error);
      Alert.alert('Error', 'Failed to create incentive. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const addRemark = async () => {
    try {
      if (!token || !newRemark.trim()) {
        Alert.alert('Error', 'Please enter a remark');
        return;
      }

      setAddingRemark(true);

      const response = await fetch(`${BACKEND_URL}/employee/addRemark`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          lead_id: leadId,
          remark: newRemark.trim()
        })
      });

      if (!response.ok) {
        throw new Error('Failed to add remark');
      }

      const data = await response.json();
      setIncentiveData(data.incentive);
      setNewRemark('');
      Alert.alert('Success', 'Remark added successfully!');
    } catch (error) {
      console.error('Error adding remark:', error);
      Alert.alert('Error', 'Failed to add remark. Please try again.');
    } finally {
      setAddingRemark(false);
    }
  };

  const acceptIncentive = async () => {
    try {
      if (!token) return;

      const response = await fetch(`${BACKEND_URL}/employee/acceptIncentive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, lead_id: leadId })
      });

      if (!response.ok) {
        throw new Error('Failed to accept incentive');
      }

      Alert.alert('Success', 'Incentive accepted successfully!');
      fetchIncentive();
    } catch (error) {
      console.error('Error accepting incentive:', error);
      Alert.alert('Error', 'Failed to accept incentive. Please try again.');
    }
  };

  const acceptPaymentConfirmation = async () => {
    try {
      if (!token) return;

      const response = await fetch(`${BACKEND_URL}/employee/acceptPaymentConfirmation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, lead_id: leadId })
      });

      if (!response.ok) {
        throw new Error('Failed to accept payment confirmation');
      }

      Alert.alert('Success', 'Payment confirmation accepted successfully!');
      fetchIncentive();
    } catch (error) {
      console.error('Error accepting payment confirmation:', error);
      Alert.alert('Error', 'Failed to accept payment confirmation. Please try again.');
    }
  };

  const calculateIncentive = () => {
    const gross = parseFloat(grossIncome) || 0;
    const referral = parseFloat(referralAmt) || 0;
    const expenses = parseFloat(bdtExpenses) || 0;
    const goodwillAmt = parseFloat(goodwill) || 0;
    
    const netCompanyEarning = gross - referral;
    const intercityAmount = intercityDeals ? netCompanyEarning * 0.5 : 0;
    const baseAmount = intercityDeals ? intercityAmount : netCompanyEarning;
    
    const sharePercentage = parseFloat(bdtSharePercentage) || 7;
    const bdtShare = (baseAmount * sharePercentage) / 100;
    const tds = bdtShare * 0.1;
    const netAmount = bdtShare - tds;

    return {
      gross,
      referral,
      netCompanyEarning,
      intercityAmount: intercityDeals ? intercityAmount : null,
      bdtShare,
      tds,
      netAmount
    };
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number | null): string => {
    if (amount === null) return '₹0.00';
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'pending': return colors.warning;
      case 'correction': return colors.error;
      case 'accepted': return colors.success;
      case 'payment_raised': return colors.info;
      case 'paid': return colors.primary;
      default: return colors.textSecondary;
    }
  };

  const getStatusText = (status: string): string => {
    switch (status) {
      case 'pending': return 'Pending Review';
      case 'correction': return 'Needs Correction';
      case 'accepted': return 'Accepted';
      case 'payment_raised': return 'Payment Raised';
      case 'paid': return 'Paid';
      default: return status;
    }
  };

  const BackIcon = () => (
    <View style={styles.backIcon}>
      <View style={styles.backArrow} />
    </View>
  );

  if (loading && !incentiveData) {
    return (
      <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <BackIcon />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Incentive Details</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading incentive data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isEditMode) {
    const calculated = calculateIncentive();

    return (
      <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <BackIcon />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Incentive</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Lead: {leadName}</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Gross Income Received (before GST) *</Text>
              <TextInput
                style={styles.input}
                value={grossIncome}
                onChangeText={setGrossIncome}
                placeholder="Enter amount"
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.checkboxContainer}>
              <TouchableOpacity
                style={styles.checkbox}
                onPress={() => setIntercityDeals(!intercityDeals)}
              >
                {intercityDeals && <View style={styles.checkboxChecked} />}
              </TouchableOpacity>
              <Text style={styles.checkboxLabel}>InterCity Deal (50:50)</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Referral Amount *</Text>
              <TextInput
                style={styles.input}
                value={referralAmt}
                onChangeText={setReferralAmt}
                placeholder="Enter amount"
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>BD Expenses *</Text>
              <TextInput
                style={styles.input}
                value={bdtExpenses}
                onChangeText={setBdtExpenses}
                placeholder="Enter amount"
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Goodwill *</Text>
              <TextInput
                style={styles.input}
                value={goodwill}
                onChangeText={setGoodwill}
                placeholder="Enter amount"
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Your Share Percentage</Text>
              <TextInput
                style={styles.input}
                value={bdtSharePercentage}
                onChangeText={setBdtSharePercentage}
                placeholder="7"
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Calculated Incentive</Text>
            
            <View style={styles.calculationRow}>
              <Text style={styles.calculationLabel}>Brokerage Amount (Gross):</Text>
              <Text style={styles.calculationValue}>{formatCurrency(calculated.gross)}</Text>
            </View>

            <View style={styles.calculationRow}>
              <Text style={styles.calculationLabel}>Less Referral Fee:</Text>
              <Text style={styles.calculationValue}>{formatCurrency(calculated.referral)}</Text>
            </View>

            <View style={[styles.calculationRow, styles.highlightRow]}>
              <Text style={styles.calculationLabelBold}>Net Company Earnings:</Text>
              <Text style={styles.calculationValueBold}>{formatCurrency(calculated.netCompanyEarning)}</Text>
            </View>

            {intercityDeals && (
              <View style={styles.calculationRow}>
                <Text style={styles.calculationLabel}>Intercity 50:50:</Text>
                <Text style={styles.calculationValue}>{formatCurrency(calculated.intercityAmount)}</Text>
              </View>
            )}

            <View style={styles.calculationRow}>
              <Text style={styles.calculationLabel}>Your Share ({bdtSharePercentage}%):</Text>
              <Text style={styles.calculationValue}>{formatCurrency(calculated.bdtShare)}</Text>
            </View>

            <View style={styles.calculationRow}>
              <Text style={styles.calculationLabel}>Less 10% TDS:</Text>
              <Text style={styles.calculationValue}>{formatCurrency(calculated.tds)}</Text>
            </View>

            <View style={[styles.calculationRow, styles.finalRow]}>
              <Text style={styles.finalLabel}>Net Amount Payable:</Text>
              <Text style={styles.finalValue}>{formatCurrency(calculated.netAmount)}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={createIncentive}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <Text style={styles.submitButtonText}>Submit Incentive</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (!incentiveData) {
    return (
      <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <BackIcon />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Incentive Details</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No incentive data found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <BackIcon />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Incentive Details</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <View style={styles.statusHeader}>
            <Text style={styles.cardTitle}>Lead: {leadName}</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(incentiveData.status) }]}>
              <Text style={styles.statusText}>{getStatusText(incentiveData.status)}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Created:</Text>
            <Text style={styles.infoValue}>{formatDate(incentiveData.created_at)}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Last Updated:</Text>
            <Text style={styles.infoValue}>{formatDate(incentiveData.updated_at)}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Incentive Breakdown</Text>

          <View style={styles.calculationRow}>
            <Text style={styles.calculationLabel}>Brokerage Amount (Gross):</Text>
            <Text style={styles.calculationValue}>{formatCurrency(incentiveData.gross_income_recieved)}</Text>
          </View>

          <View style={styles.calculationRow}>
            <Text style={styles.calculationLabel}>Less Referral Fee:</Text>
            <Text style={styles.calculationValue}>{formatCurrency(incentiveData.referral_amt)}</Text>
          </View>

          <View style={[styles.calculationRow, styles.highlightRow]}>
            <Text style={styles.calculationLabelBold}>Net Company Earnings:</Text>
            <Text style={styles.calculationValueBold}>
              {formatCurrency(incentiveData.net_company_earning)}
            </Text>
          </View>

          {incentiveData.intercity_deals && (
            <View style={styles.calculationRow}>
              <Text style={styles.calculationLabel}>Intercity 50:50:</Text>
              <Text style={styles.calculationValue}>{formatCurrency(incentiveData.intercity_amount)}</Text>
            </View>
          )}

          <View style={styles.calculationRow}>
            <Text style={styles.calculationLabel}>Your Share (7%):</Text>
            <Text style={styles.calculationValue}>{formatCurrency(incentiveData.bdt_share)}</Text>
          </View>

          <View style={styles.calculationRow}>
            <Text style={styles.calculationLabel}>Less 10% TDS:</Text>
            <Text style={styles.calculationValue}>{formatCurrency(incentiveData.less_tax)}</Text>
          </View>

          <View style={[styles.calculationRow, styles.finalRow]}>
            <Text style={styles.finalLabel}>Net Amount Payable:</Text>
            <Text style={styles.finalValue}>{formatCurrency(incentiveData.final_amount_payable)}</Text>
          </View>
        </View>

        {incentiveData.remarks.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Remarks ({incentiveData.remarks.length})</Text>
            {incentiveData.remarks.map((remark, index) => (
              <View key={index} style={styles.remarkItem}>
                <View style={styles.remarkHeader}>
                  <Text style={styles.remarkAuthor}>{remark.username}</Text>
                  <Text style={styles.remarkDate}>{formatDate(remark.created_at)}</Text>
                </View>
                <Text style={styles.remarkText}>{remark.remark}</Text>
              </View>
            ))}
          </View>
        )}

        {incentiveData.status === 'correction' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Add Remark</Text>
            <TextInput
              style={styles.remarkInput}
              value={newRemark}
              onChangeText={setNewRemark}
              placeholder="Enter your remark..."
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <TouchableOpacity
              style={[styles.submitButton, addingRemark && styles.submitButtonDisabled]}
              onPress={addRemark}
              disabled={addingRemark}
            >
              {addingRemark ? (
                <ActivityIndicator color={colors.white} size="small" />
              ) : (
                <Text style={styles.submitButtonText}>Add Remark</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {incentiveData.status === 'correction' && (
          <TouchableOpacity style={styles.acceptButton} onPress={acceptIncentive}>
            <Text style={styles.acceptButtonText}>Accept Incentive</Text>
          </TouchableOpacity>
        )}

        {incentiveData.status === 'payment_raised' && (
          <TouchableOpacity style={styles.acceptButton} onPress={acceptPaymentConfirmation}>
            <Text style={styles.acceptButtonText}>Accept Payment Confirmation</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.primary,
  },
  backButton: {
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  backIcon: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    width: 12,
    height: 12,
    borderLeftWidth: 2,
    borderTopWidth: 2,
    borderColor: colors.white,
    transform: [{ rotate: '-45deg' }],
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: '600',
    color: colors.white,
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  card: {
    backgroundColor: colors.white,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    ...shadows.md,
  },
  cardTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
  },
  statusText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
    backgroundColor: colors.white,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: borderRadius.sm,
    marginRight: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    width: 14,
    height: 14,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.sm,
  },
  checkboxLabel: {
    fontSize: fontSize.md,
    color: colors.text,
    fontWeight: '500',
  },
  calculationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  calculationLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  calculationValue: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: '500',
  },
  highlightRow: {
    backgroundColor: colors.info + '10',
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  calculationLabelBold: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: '600',
  },
  calculationValueBold: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: '700',
  },
  finalRow: {
    backgroundColor: colors.success + '10',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.sm,
    marginTop: spacing.sm,
  },
  finalLabel: {
    fontSize: fontSize.md,
    color: colors.success,
    fontWeight: '700',
  },
  finalValue: {
    fontSize: fontSize.md,
    color: colors.success,
    fontWeight: '700',
  },
  submitButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    ...shadows.md,
  },
  submitButtonDisabled: {
    backgroundColor: colors.textSecondary,
    opacity: 0.6,
  },
  submitButtonText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  acceptButton: {
    backgroundColor: colors.success,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    ...shadows.md,
  },
  acceptButtonText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  infoLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  infoValue: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: '500',
  },
  remarkItem: {
    backgroundColor: colors.backgroundSecondary,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  remarkHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  remarkAuthor: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: '600',
  },
  remarkDate: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  remarkText: {
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 20,
  },
  remarkInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    backgroundColor: colors.white,
    fontSize: fontSize.sm,
    color: colors.text,
    marginBottom: spacing.md,
    textAlignVertical: 'top',
    minHeight: 100,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundSecondary,
  },
  loadingText: {
    marginTop: spacing.md,
    color: colors.textSecondary,
    fontSize: fontSize.md,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundSecondary,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
  },
});

export default Incentive;