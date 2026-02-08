import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView,
  StatusBar, Alert, TextInput, ActivityIndicator
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, borderRadius, shadows } from './theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BACKEND_URL } from '../../config/config';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemeColors } from './types';

const TOKEN_KEY = 'token_2';

interface IncentiveProps {
  onBack: () => void;
  leadId: number;
  leadName: string;
  hideHeader?: boolean;
  theme: ThemeColors;
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
  status: 'pending' | 'correction' | 'accepted' | 'accepted_by_bdt' | 'payment_confirmation' | 'completed';
  remarks: Remark[];
  city?: string;
}

const Incentive: React.FC<IncentiveProps> = ({ onBack, leadId, leadName, hideHeader, theme }) => {
  const insets = useSafeAreaInsets();
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [incentiveData, setIncentiveData] = useState<IncentiveData | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [newRemark, setNewRemark] = useState('');
  const [addingRemark, setAddingRemark] = useState(false);
  const [updating, setUpdating] = useState(false);

  // BUP specific fields
  const [bdtSharePercentage, setBdtSharePercentage] = useState('');
  const [tdsPercentage, setTdsPercentage] = useState('');

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

  const formatNumberWithCommas = (value: string): string => {
    const number = value.replace(/[^0-9.]/g, '');
    const parts = number.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
  };

  const parseFormattedNumber = (value: string): string => {
    return value.replace(/,/g, '');
  };

  const fetchIncentive = async () => {
    try {
      if (!token) return;
      setLoading(true);
      const response = await fetch(`${BACKEND_URL}/manager/getIncentive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, lead_id: leadId })
      });

      if (!response.ok) {
        const errorData = await response.json();
        Alert.alert('Error', errorData.message || 'Failed to fetch incentive');
        onBack();
        return;
      }

      const data = await response.json();
      setIncentiveData(data.incentive);

      // Pre-fill BDT share and TDS if already set
      if (data.incentive.bdt_share && data.incentive.intercity_amount) {
        const bdtPercent = (data.incentive.bdt_share / data.incentive.intercity_amount) * 100;
        setBdtSharePercentage(bdtPercent.toFixed(2));
      }
      if (data.incentive.tds_deducted && data.incentive.bdt_share) {
        const tdsPercent = (data.incentive.tds_deducted / data.incentive.bdt_share) * 100;
        setTdsPercentage(tdsPercent.toFixed(2));
      }

    } catch (error) {
      console.error('Error fetching incentive:', error);
      Alert.alert('Error', 'Failed to fetch incentive data');
      onBack();
    } finally {
      setLoading(false);
    }
  };

  const calculateBDTAmounts = () => {
    if (!incentiveData || !bdtSharePercentage || !tdsPercentage) {
      return { bdtShare: 0, tdsDeducted: 0, finalAmount: 0 };
    }

    const intercityAmount = incentiveData.intercity_amount || 0;
    const bdtPercent = parseFloat(bdtSharePercentage) || 0;
    const tdsPercent = parseFloat(tdsPercentage) || 0;

    const bdtShare = (intercityAmount * bdtPercent) / 100;
    const tdsDeducted = (bdtShare * tdsPercent) / 100;
    const finalAmount = bdtShare - tdsDeducted;

    return { bdtShare, tdsDeducted, finalAmount };
  };

  const updateIncentive = async () => {
    try {
      if (!token || !incentiveData) return;

      if (!bdtSharePercentage || !tdsPercentage) {
        Alert.alert('Error', 'Please enter BDT share percentage and TDS percentage');
        return;
      }

      const calculated = calculateBDTAmounts();

      setUpdating(true);
      const response = await fetch(`${BACKEND_URL}/manager/updateIncentive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          lead_id: leadId,
          bdt_share: calculated.bdtShare,
          tds_deducted: calculated.tdsDeducted,
          final_amount_payable: calculated.finalAmount,
          remark: newRemark.trim() || undefined
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update incentive');
      }

      const data = await response.json();
      setIncentiveData(data.incentive);
      setNewRemark('');
      Alert.alert('Success', 'Incentive updated successfully! BDT will review the changes.');

    } catch (error) {
      console.error('Error updating incentive:', error);
      Alert.alert('Error', 'Failed to update incentive. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  const acceptIncentive = async () => {
    try {
      if (!token) return;
      const response = await fetch(`${BACKEND_URL}/manager/acceptIncentive`, {
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

  const sendForPayment = async () => {
    try {
      if (!token) return;
      const response = await fetch(`${BACKEND_URL}/manager/sendIncentiveForPayment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, lead_id: leadId })
      });

      if (!response.ok) {
        throw new Error('Failed to send for payment');
      }

      Alert.alert('Success', 'Incentive sent for payment confirmation!');
      fetchIncentive();
    } catch (error) {
      console.error('Error sending for payment:', error);
      Alert.alert('Error', 'Failed to send for payment. Please try again.');
    }
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
      case 'correction': return colors.warning;
      case 'accepted': return colors.success;
      case 'accepted_by_bdt': return colors.info;
      case 'payment_confirmation': return colors.primary;
      case 'completed': return colors.success;
      default: return colors.textSecondary;
    }
  };

  const getStatusText = (status: string): string => {
    switch (status) {
      case 'pending': return 'Pending BUP Review';
      case 'correction': return 'Awaiting BDT Review';
      case 'accepted': return 'Accepted by BUP';
      case 'accepted_by_bdt': return 'Accepted by BDT';
      case 'payment_confirmation': return 'Payment Processing';
      case 'completed': return 'Completed';
      default: return status;
    }
  };

  const BackIcon = () => (
    <View style={styles.backIcon}>
      <View style={styles.backArrow} />
      <Text style={styles.backText}>Back</Text>
    </View>
  );

  const GreenHeader = () => (
    <LinearGradient
      colors={['#075E54', '#075E54']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.greenHeader}
    >
      <View style={styles.greenHeaderContent} />
    </LinearGradient>
  );

  if (loading && !incentiveData) {
    return (
      <View style={styles.container}>
        {!hideHeader && (
          <>
            <StatusBar barStyle="light-content" backgroundColor="#075E54" />
            <View style={styles.header}>
              <TouchableOpacity style={styles.backButton} onPress={onBack}>
                <BackIcon />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Incentive Details</Text>
              <View style={styles.headerSpacer} />
            </View>
          </>
        )}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading incentive data...</Text>
        </View>
      </View>
    );
  }

  if (!incentiveData) {
    return (
      <View style={styles.container}>
        {!hideHeader && (
          <>
            <StatusBar barStyle="light-content" backgroundColor="#075E54" />
            <GreenHeader />
            <View style={[styles.header, styles.headerWithGreen]}>
              <TouchableOpacity style={styles.backButton} onPress={onBack}>
                <BackIcon />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Incentive Details</Text>
              <View style={styles.headerSpacer} />
            </View>
          </>
        )}
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No incentive data found</Text>
        </View>
      </View>
    );
  }

  const calculated = calculateBDTAmounts();

  return (
    <View style={styles.container}>
      {!hideHeader && (
        <>
          <StatusBar barStyle="light-content" backgroundColor="#075E54" />
          <GreenHeader />
          <View style={[styles.header, styles.headerWithGreen,{paddingBottom: -10}]}>
            <TouchableOpacity style={styles.backButton} onPress={onBack}>
              <BackIcon />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Incentive Management</Text>
            <View style={styles.headerSpacer} />
          </View>
        </>
      )}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Status Header */}
        <View style={styles.card}>
          <View style={styles.statusHeader}>
            <Text style={styles.cardTitle}>Lead: {leadName}</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(incentiveData.status) }]}>
              <Text style={styles.statusText}>{getStatusText(incentiveData.status)}</Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>BDT:</Text>
            <Text style={styles.infoValue}>{incentiveData.bdt.full_name}</Text>
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

        {/* Transaction Details */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Transaction Details</Text>
          <View style={[styles.infoRow, styles.dividerRow]}>
            <Text style={styles.infoLabel}>Gross Income:</Text>
            <Text style={styles.infoValue}>{formatCurrency(incentiveData.gross_income_recieved)}</Text>
          </View>
          {incentiveData.referral_amt > 0 && (
            <View style={[styles.infoRow, styles.dividerRow]}>
              <Text style={styles.infoLabel}>Referral Amount:</Text>
              <Text style={styles.infoValue}>{formatCurrency(incentiveData.referral_amt)}</Text>
            </View>
          )}
          {incentiveData.bdt_expenses > 0 && (
            <View style={[styles.infoRow, styles.dividerRow]}>
              <Text style={styles.infoLabel}>BD Expenses:</Text>
              <Text style={styles.infoValue}>{formatCurrency(incentiveData.bdt_expenses)}</Text>
            </View>
          )}
          {incentiveData.goodwill > 0 && (
            <View style={[styles.infoRow, styles.dividerRow]}>
              <Text style={styles.infoLabel}>Goodwill:</Text>
              <Text style={styles.infoValue}>{formatCurrency(incentiveData.goodwill)}</Text>
            </View>
          )}
          <View style={[styles.infoRow, styles.dividerRow]}>
            <Text style={styles.infoLabel}>Net Company Earning:</Text>
            <Text style={styles.infoValue}>{formatCurrency(incentiveData.net_company_earning)}</Text>
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
          {incentiveData.intercity_deals && (
            <View style={[styles.infoRow, styles.highlightRow]}>
              <Text style={styles.calculationLabelBold}>Intercity Share (50%):</Text>
              <Text style={styles.calculationValueBold}>{formatCurrency(incentiveData.intercity_amount)}</Text>
            </View>
          )}
        </View>

        {/* BUP Input Section - Only show if status allows editing */}
        {(incentiveData.status === 'pending' || incentiveData.status === 'correction') && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Set BDT Share & TDS</Text>
            {/* <Text style={styles.infoCardText}>
              Calculate BDT share and TDS based on intercity amount: {formatCurrency(incentiveData.intercity_amount)}
            </Text> */}

            <View style={[{display:'flex', flexDirection:'row',justifyContent:'space-between'}]}>
              <View style={[styles.inputGroup,{width:'47%'}]}>
                <Text style={styles.label}>BDT Share Percentage *</Text>
                <TextInput
                  style={styles.input}
                  value={bdtSharePercentage}
                  onChangeText={setBdtSharePercentage}
                  placeholder="Enter percentage (e.g., 60)"
                  keyboardType="numeric"
                />
              </View>

              <View style={[styles.inputGroup,{width:'47%'}]}>
                <Text style={styles.label}>TDS Percentage *</Text>
                <TextInput
                  style={styles.input}
                  value={tdsPercentage}
                  onChangeText={setTdsPercentage}
                  placeholder="Enter percentage (e.g., 10)"
                  keyboardType="numeric"
                />
              </View>
            </View>

            {bdtSharePercentage && tdsPercentage && (
              <View style={styles.calculationPreview}>
                <Text style={styles.previewTitle}>Calculated Amounts:</Text>
                <View style={styles.calculationRow}>
                  <Text style={styles.calculationLabel}>BDT Share:</Text>
                  <Text style={styles.calculationValue}>{formatCurrency(calculated.bdtShare)}</Text>
                </View>
                <View style={styles.calculationRow}>
                  <Text style={styles.calculationLabel}>TDS Deducted:</Text>
                  <Text style={[styles.calculationValue, styles.negativeValue]}>
                    - {formatCurrency(calculated.tdsDeducted)}
                  </Text>
                </View>
                <View style={[styles.calculationRow, styles.finalRow]}>
                  <Text style={styles.finalLabel}>Final Amount Payable:</Text>
                  <Text style={styles.finalValue}>{formatCurrency(calculated.finalAmount)}</Text>
                </View>
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Remark (Optional)</Text>
              <TextInput
                style={styles.remarkInput}
                value={newRemark}
                onChangeText={setNewRemark}
                placeholder="Add a remark for BDT..."
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <LinearGradient
              colors={['#075E54', '#075E54']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.submitButton, updating && styles.submitButtonDisabled]}
            >
              <TouchableOpacity
                onPress={updateIncentive}
                disabled={updating}
                style={styles.submitButtonTouchable}
                activeOpacity={0.8}
              >
                {updating ? (
                  <ActivityIndicator color={colors.white} size="small" />
                ) : (
                  <Text style={styles.submitButtonText}>Update Incentive</Text>
                )}
              </TouchableOpacity>
            </LinearGradient>
          </View>
        )}

        {/* Display Final Amounts if already calculated */}
        {incentiveData.bdt_share !== null && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>BDT Earnings Breakdown</Text>
            <View style={styles.calculationRow}>
              <Text style={styles.calculationLabel}>BDT Share:</Text>
              <Text style={styles.calculationValue}>{formatCurrency(incentiveData.bdt_share)}</Text>
            </View>
            <View style={styles.calculationRow}>
              <Text style={styles.calculationLabel}>Less: TDS:</Text>
              <Text style={[styles.calculationValue, styles.negativeValue]}>
                - {formatCurrency(incentiveData.tds_deducted)}
              </Text>
            </View>
            <View style={[styles.calculationRow, styles.finalRow]}>
              <Text style={styles.finalLabel}>Final Amount Payable:</Text>
              <Text style={styles.finalValue}>{formatCurrency(incentiveData.final_amount_payable)}</Text>
            </View>
          </View>
        )}

        {/* Remarks Section */}
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

        {/* Action Buttons based on status */}
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
              This incentive has been fully processed and paid. No further actions are available.
            </Text>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
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
    marginTop: 10,
    // height: 20
  },
  headerWithGreen: {
    backgroundColor: 'transparent',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  greenHeader: {
    paddingTop: 80,
    paddingBottom: 0,
    paddingHorizontal: 20,
    height: 20
  },
  greenHeaderContent: {
    marginTop: 0,
    paddingBottom:30
  },
  backButton: {
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  backIcon: {
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    display: 'flex',
    flexDirection: 'row',
    alignContent: 'center',
  },
  backArrow: {
    width: 12,
    height: 12,
    borderLeftWidth: 2,
    borderTopWidth: 2,
    borderColor: colors.white,
    transform: [{ rotate: '-45deg' }],
  },
  backText: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 2,
  },
  headerTitle: {
    fontWeight: '600',
    color: colors.white,
    flex: 1,
    textAlign: 'center',
    fontSize: 20,
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
    marginTop: -15,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
  },
  statusText: {
    color: colors.white,
    fontSize: 12,
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
  calculationPreview: {
    backgroundColor: colors.backgroundSecondary,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
  },
  previewTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
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
    flex: 1,
  },
  calculationValue: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: '500',
  },
  calculationLabelBold: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: '600',
    flex: 1,
  },
  calculationValueBold: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: '700',
  },
  negativeValue: {
    color: colors.error,
  },
  highlightRow: {
    backgroundColor: colors.info + '10',
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
    marginVertical: spacing.xs,
  },
  finalRow: {
    backgroundColor: colors.success + '15',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    marginTop: spacing.md,
    borderWidth: 2,
    borderColor: colors.success,
  },
  finalLabel: {
    fontSize: fontSize.md,
    color: colors.success,
    fontWeight: '700',
    flex: 1,
  },
  finalValue: {
    fontSize: fontSize.lg,
    color: colors.success,
    fontWeight: '700',
  },
  remarkInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    backgroundColor: colors.white,
    fontSize: fontSize.sm,
    color: colors.text,
    textAlignVertical: 'top',
    minHeight: 100,
  },
  submitButton: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    marginTop: spacing.lg,
    ...shadows.md,
  },
  submitButtonTouchable: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 0,
  },
  submitButtonText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  submitButtonDisabled: {
    opacity: 0.7,
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
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  dividerRow: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: spacing.sm,
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
  intercityBadgeYes: {
    backgroundColor: colors.success + '20',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.success,
  },
  intercityBadgeNo: {
    backgroundColor: colors.textSecondary + '20',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.textSecondary,
  },
  intercityTextYes: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.success,
  },
  intercityTextNo: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textSecondary,
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
  infoCard: {
    backgroundColor: colors.info + '15',
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.info,
  },
  infoCardTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.info,
    marginBottom: spacing.xs,
  },
  infoCardText: {
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 20,
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