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
  const [showCalculation, setShowCalculation] = useState(false);

  const [grossIncome, setGrossIncome] = useState('');
  const [referralAmt, setReferralAmt] = useState('');
  const [bdtExpenses, setBdtExpenses] = useState('');
  const [goodwill, setGoodwill] = useState('');
  const [intercityDeals, setIntercityDeals] = useState('No');
  const [bdtSharePercentage, setBdtSharePercentage] = useState('7');
  const [showIntercityDropdown, setShowIntercityDropdown] = useState(false);

  // Format number with commas as user types
  const formatNumberWithCommas = (value: string): string => {
    const number = value.replace(/[^0-9.]/g, '');
    const parts = number.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
  };

  const parseFormattedNumber = (value: string): string => {
    return value.replace(/,/g, '');
  };

  const handleGrossIncomeChange = (text: string) => {
    const formatted = formatNumberWithCommas(text);
    setGrossIncome(formatted);
  };

  const handleReferralAmtChange = (text: string) => {
    const formatted = formatNumberWithCommas(text);
    setReferralAmt(formatted);
  };

  const handleBdtExpensesChange = (text: string) => {
    const formatted = formatNumberWithCommas(text);
    setBdtExpenses(formatted);
  };

  const handleGoodwillChange = (text: string) => {
    const formatted = formatNumberWithCommas(text);
    setGoodwill(formatted);
  };

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

      const contentType = response.headers.get('content-type');
      
      if (!contentType || !contentType.includes('application/json')) {
        console.error('Expected JSON but received:', contentType);
        const textResponse = await response.text();
        console.error('Response text:', textResponse);
        setIsEditMode(true);
        return;
      }

      if (response.ok) {
        const data = await response.json();
        setIncentiveData(data.incentive);
        setGrossIncome(formatNumberWithCommas(data.incentive.gross_income_recieved.toString()));
        setReferralAmt(formatNumberWithCommas(data.incentive.referral_amt.toString()));
        setBdtExpenses(formatNumberWithCommas(data.incentive.bdt_expenses.toString()));
        setGoodwill(formatNumberWithCommas(data.incentive.goodwill.toString()));
        setIntercityDeals(data.incentive.intercity_deals ? 'Yes' : 'No');
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

      const calculated = calculateIncentive();
      const isIntercity = intercityDeals === 'Yes';

      const response = await fetch(`${BACKEND_URL}/employee/createIncentive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          lead_id: leadId,
          gross_income_recieved: parseFormattedNumber(grossIncome),
          referral_amt: parseFormattedNumber(referralAmt),
          bdt_expenses: parseFormattedNumber(bdtExpenses),
          goodwill: parseFormattedNumber(goodwill),
          intercity_deals: isIntercity,
          intercity_amount: calculated.intercityAmount,
          net_company_earning: calculated.netCompanyEarning,
          bdt_share: calculated.bdtShare,
          tds_deducted: calculated.tds,
          less_tax: calculated.tds,
          final_amount_payable: calculated.netAmount
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create incentive');
      }

      const data = await response.json();
      setIncentiveData(data.incentive);
      setIsEditMode(false);
      setShowCalculation(false);
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
    const gross = parseFloat(parseFormattedNumber(grossIncome)) || 0;
    const referral = parseFloat(parseFormattedNumber(referralAmt)) || 0;
    const expenses = parseFloat(parseFormattedNumber(bdtExpenses)) || 0;
    const goodwillAmt = parseFloat(parseFormattedNumber(goodwill)) || 0;
    
    const netCompanyEarning = gross - referral;
    const isIntercity = intercityDeals === 'Yes';
    const intercityAmount = isIntercity ? netCompanyEarning * 0.5 : 0;
    const baseAmount = isIntercity ? intercityAmount : netCompanyEarning;
    
    const sharePercentage = parseFloat(bdtSharePercentage) || 7;
    const bdtShare = (baseAmount * sharePercentage) / 100;
    const tds = bdtShare * 0.1;
    const netAmount = bdtShare - tds;

    return {
      gross,
      referral,
      netCompanyEarning,
      intercityAmount: isIntercity ? intercityAmount : null,
      bdtShare,
      tds,
      netAmount
    };
  };

  const handleContinue = () => {
    if (!grossIncome || !referralAmt || !bdtExpenses || !goodwill || !bdtSharePercentage) {
      Alert.alert('Missing Fields', 'Please fill all required fields before continuing');
      return;
    }
    setShowCalculation(true);
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
      case 'accepted_by_bdt': return colors.success;
      case 'payment_confirmation': return colors.info;
      case 'completed': return colors.primary;
      default: return colors.textSecondary;
    }
  };

  const getStatusText = (status: string): string => {
    switch (status) {
      case 'pending': return 'Under Review';
      case 'correction': return 'Needs Correction';
      case 'accepted': return 'Accepted';
      case 'accepted_by_bdt': return 'Confirmed';
      case 'payment_confirmation': return 'Payment Processing';
      case 'completed': return 'Completed';
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

    if (showCalculation) {
      return (
        <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
          <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => setShowCalculation(false)}>
              <BackIcon />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Review & Submit</Text>
            <View style={styles.headerSpacer} />
          </View>

          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            <View style={styles.card}>
              <Text style={styles.reviewTitle}>Review Incentive Details</Text>
              <Text style={styles.leadNameLarge}>{leadName}</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Transaction Summary</Text>
              
              <View style={styles.summaryGrid}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Gross Income</Text>
                  <Text style={styles.summaryValue}>{formatCurrency(calculated.gross)}</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Referral Fee</Text>
                  <Text style={styles.summaryValue}>{formatCurrency(calculated.referral)}</Text>
                </View>
              </View>

              <View style={styles.summaryGrid}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Goodwill Amount</Text>
                  <Text style={styles.summaryValue}>{formatCurrency(parseFloat(parseFormattedNumber(goodwill)) || 0)}</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>BD Expenses</Text>
                  <Text style={styles.summaryValue}>{formatCurrency(parseFloat(parseFormattedNumber(bdtExpenses)) || 0)}</Text>
                </View>
              </View>

              <View style={styles.summaryGrid}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Your Share</Text>
                  <Text style={styles.summaryValue}>{bdtSharePercentage}%</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Deal Type</Text>
                  <View style={intercityDeals === 'Yes' ? styles.intercityBadgeYes : styles.intercityBadgeNo}>
                    <Text style={intercityDeals === 'Yes' ? styles.intercityTextYes : styles.intercityTextNo}>
                      {intercityDeals === 'Yes' ? 'Intercity' : 'Local'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Earnings Breakdown</Text>

              <View style={styles.calculationRow}>
                <Text style={styles.calculationLabel}>Brokerage Amount (Gross)</Text>
                <Text style={styles.calculationValue}>{formatCurrency(calculated.gross)}</Text>
              </View>

              <View style={styles.calculationRow}>
                <Text style={styles.calculationLabel}>Less: Referral Fee</Text>
                <Text style={[styles.calculationValue, styles.negativeValue]}>
                  - {formatCurrency(calculated.referral)}
                </Text>
              </View>

              <View style={[styles.calculationRow, styles.highlightRow]}>
                <Text style={styles.calculationLabelBold}>Net Company Earnings</Text>
                <Text style={styles.calculationValueBold}>{formatCurrency(calculated.netCompanyEarning)}</Text>
              </View>

              {intercityDeals === 'Yes' && (
                <View style={styles.calculationRow}>
                  <Text style={styles.calculationLabel}>Intercity Share (50%)</Text>
                  <Text style={styles.calculationValue}>{formatCurrency(calculated.intercityAmount)}</Text>
                </View>
              )}

              <View style={styles.calculationRow}>
                <Text style={styles.calculationLabel}>Your Share ({bdtSharePercentage}%)</Text>
                <Text style={styles.calculationValue}>{formatCurrency(calculated.bdtShare)}</Text>
              </View>

              <View style={styles.calculationRow}>
                <Text style={styles.calculationLabel}>Less: TDS (10%)</Text>
                <Text style={[styles.calculationValue, styles.negativeValue]}>
                  - {formatCurrency(calculated.tds)}
                </Text>
              </View>

              <View style={[styles.calculationRow, styles.finalRow]}>
                <Text style={styles.finalLabel}>Net Amount Payable</Text>
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

            <View style={{ height: 100 }} />
          </ScrollView>
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
          <Text style={styles.headerTitle}>Create Incentive</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Incentive Details</Text>
            <Text style={styles.leadName}>Lead: {leadName}</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Income Information</Text>
            
            <View style={styles.rowContainer}>
              <View style={styles.halfInput}>
                <Text style={styles.label}>Gross Income *</Text>
                <TextInput
                  style={styles.input}
                  value={grossIncome}
                  onChangeText={handleGrossIncomeChange}
                  placeholder="₹ 0"
                  keyboardType="decimal-pad"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <View style={styles.halfInput}>
                <Text style={styles.label}>Referral Amount *</Text>
                <TextInput
                  style={styles.input}
                  value={referralAmt}
                  onChangeText={handleReferralAmtChange}
                  placeholder="₹ 0"
                  keyboardType="decimal-pad"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
            </View>

            <View style={styles.rowContainer}>
              <View style={styles.halfInput}>
                <Text style={styles.label}>Goodwill *</Text>
                <TextInput
                  style={styles.input}
                  value={goodwill}
                  onChangeText={handleGoodwillChange}
                  placeholder="₹ 0"
                  keyboardType="decimal-pad"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <View style={styles.halfInput}>
                <Text style={styles.label}>Your Share % *</Text>
                <TextInput
                  style={styles.input}
                  value={bdtSharePercentage}
                  onChangeText={setBdtSharePercentage}
                  placeholder="7"
                  keyboardType="decimal-pad"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>BD Expenses *</Text>
              <TextInput
                style={styles.input}
                value={bdtExpenses}
                onChangeText={handleBdtExpensesChange}
                placeholder="₹ 0"
                keyboardType="decimal-pad"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Deal Type *</Text>
              <TouchableOpacity
                style={styles.dropdown}
                onPress={() => setShowIntercityDropdown(!showIntercityDropdown)}
              >
                <Text style={styles.dropdownText}>
                  {intercityDeals === 'Yes' ? 'Intercity Deal' : 'Local Deal'}
                </Text>
                <Text style={styles.dropdownArrow}>▼</Text>
              </TouchableOpacity>
              
              {showIntercityDropdown && (
                <View style={styles.dropdownMenu}>
                  <TouchableOpacity
                    style={styles.dropdownItem}
                    onPress={() => {
                      setIntercityDeals('Yes');
                      setShowIntercityDropdown(false);
                    }}
                  >
                    <Text style={[styles.dropdownItemText, intercityDeals === 'Yes' && styles.selectedText]}>
                      Intercity Deal
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.dropdownItem}
                    onPress={() => {
                      setIntercityDeals('No');
                      setShowIntercityDropdown(false);
                    }}
                  >
                    <Text style={[styles.dropdownItemText, intercityDeals === 'No' && styles.selectedText]}>
                      Local Deal
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>

          <TouchableOpacity
            style={styles.continueButton}
            onPress={handleContinue}
          >
            <Text style={styles.continueButtonText}>Continue to Review</Text>
          </TouchableOpacity>

          <View style={{ height: 100 }} />
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
          <Text style={styles.cardTitle}>Transaction Details</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Gross Income:</Text>
            <Text style={styles.infoValue}>{formatCurrency(incentiveData.gross_income_recieved)}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Referral Amount:</Text>
            <Text style={styles.infoValue}>{formatCurrency(incentiveData.referral_amt)}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Goodwill:</Text>
            <Text style={styles.infoValue}>{formatCurrency(incentiveData.goodwill)}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>BD Expenses:</Text>
            <Text style={styles.infoValue}>{formatCurrency(incentiveData.bdt_expenses)}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Deal Type:</Text>
            <View style={incentiveData.intercity_deals ? styles.intercityBadgeYes : styles.intercityBadgeNo}>
              <Text style={incentiveData.intercity_deals ? styles.intercityTextYes : styles.intercityTextNo}>
                {incentiveData.intercity_deals ? 'Intercity' : 'Local'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Earnings Breakdown</Text>

          <View style={styles.calculationRow}>
            <Text style={styles.calculationLabel}>Brokerage Amount (Gross)</Text>
            <Text style={styles.calculationValue}>{formatCurrency(incentiveData.gross_income_recieved)}</Text>
          </View>

          <View style={styles.calculationRow}>
            <Text style={styles.calculationLabel}>Less: Referral Fee</Text>
            <Text style={[styles.calculationValue, styles.negativeValue]}>
              - {formatCurrency(incentiveData.referral_amt)}
            </Text>
          </View>

          <View style={[styles.calculationRow, styles.highlightRow]}>
            <Text style={styles.calculationLabelBold}>Net Company Earnings</Text>
            <Text style={styles.calculationValueBold}>
              {formatCurrency(incentiveData.net_company_earning)}
            </Text>
          </View>

          {incentiveData.intercity_deals && (
            <View style={styles.calculationRow}>
              <Text style={styles.calculationLabel}>Intercity Share (50%)</Text>
              <Text style={styles.calculationValue}>{formatCurrency(incentiveData.intercity_amount)}</Text>
            </View>
          )}

          <View style={styles.calculationRow}>
            <Text style={styles.calculationLabel}>Your Share (7%)</Text>
            <Text style={styles.calculationValue}>{formatCurrency(incentiveData.bdt_share)}</Text>
          </View>

          <View style={styles.calculationRow}>
            <Text style={styles.calculationLabel}>Less: TDS (10%)</Text>
            <Text style={[styles.calculationValue, styles.negativeValue]}>
              - {formatCurrency(incentiveData.less_tax)}
            </Text>
          </View>

          <View style={[styles.calculationRow, styles.finalRow]}>
            <Text style={styles.finalLabel}>Net Amount Payable</Text>
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
  reviewTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  leadName: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  leadNameLarge: {
    fontSize: fontSize.lg,
    color: colors.text,
    fontWeight: '600',
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
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  rowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  halfInput: {
    flex: 1,
    marginHorizontal: spacing.xs,
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
  dropdown: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  dropdownText: {
    fontSize: fontSize.md,
    color: colors.text,
    fontWeight: '500',
  },
  dropdownArrow: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  dropdownMenu: {
    marginTop: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.white,
    ...shadows.sm,
  },
  dropdownItem: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dropdownItemText: {
    fontSize: fontSize.md,
    color: colors.text,
  },
  selectedText: {
    color: colors.primary,
    fontWeight: '600',
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  summaryValue: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
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
  negativeValue: {
    color: colors.error,
  },
  highlightRow: {
    backgroundColor: colors.info + '10',
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
    marginVertical: spacing.xs,
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
    fontSize: fontSize.lg,
    color: colors.success,
    fontWeight: '700',
    flex: 1,
  },
  finalValue: {
    fontSize: fontSize.xl,
    color: colors.success,
    fontWeight: '700',
  },
  continueButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    ...shadows.md,
  },
  continueButtonText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: '600',
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
    alignItems: 'center',
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