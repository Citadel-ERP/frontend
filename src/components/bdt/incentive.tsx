import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView,
  StatusBar, Alert, TextInput, ActivityIndicator
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, borderRadius, shadows } from '../../styles/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BACKEND_URL } from '../../config/config';
import { LinearGradient } from 'expo-linear-gradient';

const TOKEN_KEY = 'token_2';

interface IncentiveProps {
  onBack: () => void;
  leadId: number;
  leadName: string;
  hideHeader?: boolean;
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
  city?: string;
}

const EXPENSE_OPTIONS = [
  { label: 'Referral', key: 'referral' },
  { label: 'BD Expenses', key: 'bd_expenses' },
  { label: 'Goodwill', key: 'goodwill' },
];

const INTERCITY_CITIES = [
  'Bangalore',
  'Chennai',
  'Hyderabad',
  'Mumbai',
  'NCR',
  'Pune',
  'Other',
];

const Incentive: React.FC<IncentiveProps> = ({ onBack, leadId, leadName, hideHeader }) => {
  const insets = useSafeAreaInsets();
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [incentiveData, setIncentiveData] = useState<IncentiveData | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [newRemark, setNewRemark] = useState('');
  const [addingRemark, setAddingRemark] = useState(false);
  const [showCalculation, setShowCalculation] = useState(false);

  // Form states
  const [grossIncome, setGrossIncome] = useState('');

  // Expense selection states
  const [selectedExpenses, setSelectedExpenses] = useState<Set<string>>(new Set());
  const [expenseValues, setExpenseValues] = useState<{ [key: string]: string }>({
    referral: '',
    bd_expenses: '',
    goodwill: '',
  });

  // Intercity states
  const [intercityDeals, setIntercityDeals] = useState('No');
  const [showIntercityDropdown, setShowIntercityDropdown] = useState(false);
  const [selectedCity, setSelectedCity] = useState('');
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [customCity, setCustomCity] = useState('');

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

  const handleExpenseChange = (key: string, text: string) => {
    const formatted = formatNumberWithCommas(text);
    setExpenseValues(prev => ({
      ...prev,
      [key]: formatted,
    }));
  };

  const toggleExpense = (key: string) => {
    const newSelected = new Set(selectedExpenses);
    if (newSelected.has(key)) {
      newSelected.delete(key);
      setExpenseValues(prev => ({
        ...prev,
        [key]: '',
      }));
    } else {
      newSelected.add(key);
    }
    setSelectedExpenses(newSelected);
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
        setIsEditMode(true);
        return;
      }
      if (response.ok) {
        const data = await response.json();
        setIncentiveData(data.incentive);
        setGrossIncome(formatNumberWithCommas(data.incentive.gross_income_recieved.toString()));

        // Set expense values and selected expenses based on what's available
        const newSelectedExpenses = new Set<string>();
        const newExpenseValues: { [key: string]: string } = {
          referral: '',
          bd_expenses: '',
          goodwill: '',
        };

        if (data.incentive.referral_amt > 0) {
          newSelectedExpenses.add('referral');
          newExpenseValues.referral = formatNumberWithCommas(data.incentive.referral_amt.toString());
        }
        if (data.incentive.bdt_expenses > 0) {
          newSelectedExpenses.add('bd_expenses');
          newExpenseValues.bd_expenses = formatNumberWithCommas(data.incentive.bdt_expenses.toString());
        }
        if (data.incentive.goodwill > 0) {
          newSelectedExpenses.add('goodwill');
          newExpenseValues.goodwill = formatNumberWithCommas(data.incentive.goodwill.toString());
        }

        setExpenseValues(newExpenseValues);
        setSelectedExpenses(newSelectedExpenses);
        setIntercityDeals(data.incentive.intercity_deals ? 'Yes' : 'No');
        if (data.incentive.city) {
          setSelectedCity(data.incentive.city);
        }
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
      if (!grossIncome) {
        Alert.alert('Error', 'Please enter gross income');
        return;
      }

      for (const expense of selectedExpenses) {
        if (!expenseValues[expense]) {
          Alert.alert('Error', 'Please enter values for all selected expenses');
          return;
        }
      }

      if (intercityDeals === 'Yes' && !selectedCity) {
        Alert.alert('Error', 'Please select a city for intercity deal');
        return;
      }

      if (selectedCity === 'Other' && !customCity.trim()) {
        Alert.alert('Error', 'Please enter city name for Other');
        return;
      }

      setLoading(true);
      const calculated = calculateIncentive();
      const isIntercity = intercityDeals === 'Yes';
      const cityToSend = selectedCity === 'Other' ? customCity : selectedCity;

      const response = await fetch(`${BACKEND_URL}/employee/createIncentive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          lead_id: leadId,
          gross_income_recieved: parseFormattedNumber(grossIncome),
          referral_amt: expenseValues.referral ? parseFormattedNumber(expenseValues.referral) : 0,
          bdt_expenses: expenseValues.bd_expenses ? parseFormattedNumber(expenseValues.bd_expenses) : 0,
          goodwill: expenseValues.goodwill ? parseFormattedNumber(expenseValues.goodwill) : 0,
          intercity_deals: isIntercity,
          intercity_amount: calculated.intercityAmount,
          net_company_earning: calculated.netCompanyEarning,
          bdt_share: null,
          tds_deducted: null,
          less_tax: null,
          final_amount_payable: null,
          city: isIntercity ? cityToSend : null,
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
    const referral = expenseValues.referral ? parseFloat(parseFormattedNumber(expenseValues.referral)) : 0;
    const bdExpenses = expenseValues.bd_expenses ? parseFloat(parseFormattedNumber(expenseValues.bd_expenses)) : 0;
    const goodwillAmt = expenseValues.goodwill ? parseFloat(parseFormattedNumber(expenseValues.goodwill)) : 0;

    const totalExpenses = referral + bdExpenses + goodwillAmt;
    const netCompanyEarning = gross - totalExpenses;
    const isIntercity = intercityDeals === 'Yes';
    const intercityAmount = isIntercity ? netCompanyEarning * 0.5 : netCompanyEarning;

    return {
      gross,
      referral,
      bdExpenses,
      goodwillAmt,
      totalExpenses,
      netCompanyEarning,
      intercityAmount
    };
  };

  const handleContinue = () => {
    if (!grossIncome) {
      Alert.alert('Missing Fields', 'Please enter gross income');
      return;
    }

    for (const expense of selectedExpenses) {
      if (!expenseValues[expense]) {
        Alert.alert('Error', 'Please enter values for all selected expenses');
        return;
      }
    }

    if (intercityDeals === 'Yes' && !selectedCity) {
      Alert.alert('Error', 'Please select a city for intercity deal');
      return;
    }

    if (selectedCity === 'Other' && !customCity.trim()) {
      Alert.alert('Error', 'Please enter city name');
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

  // ADDED: Green header component
  const GreenHeader = () => (
    <LinearGradient
      colors={['#075E54', '#075E54']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.greenHeader}
    >
      <View style={styles.greenHeaderContent}>
        {/* <Text style={styles.greenHeaderTitle}>Incentive Checklist</Text> */}
        {/* <Text style={styles.greenHeaderSubtitle}>Lead: {leadName}</Text> */}
      </View>
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
              <Text style={styles.headerTitle}>Incentive Checklist</Text>
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

  if (isEditMode) {
    const calculated = calculateIncentive();

    if (showCalculation) {
      return (
        <View style={styles.container}>
          {!hideHeader && (
            <>
              <StatusBar barStyle="light-content" backgroundColor="#075E54" />
              <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => setShowCalculation(false)}>
                  <BackIcon />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Review & Submit</Text>
                <View style={styles.headerSpacer} />
              </View>
            </>
          )}
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            <View style={styles.card}>
              <Text style={styles.reviewTitle}>Review Details</Text>
              <Text style={styles.leadName}>Lead: {leadName}</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Summary</Text>
              <View style={styles.summaryGrid}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Gross Income</Text>
                  <Text style={styles.summaryValue}>₹{calculated.gross.toLocaleString('en-IN')}</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Net Earning</Text>
                  <Text style={styles.summaryValue}>₹{calculated.netCompanyEarning.toLocaleString('en-IN')}</Text>
                </View>
              </View>
            </View>

            {selectedExpenses.size > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Expenses</Text>
                {calculated.referral > 0 && (
                  <View style={styles.expenseSummaryRow}>
                    <Text style={styles.infoLabel}>Referral</Text>
                    <Text style={styles.infoValue}>₹{calculated.referral.toLocaleString('en-IN')}</Text>
                  </View>
                )}
                {calculated.bdExpenses > 0 && (
                  <View style={styles.expenseSummaryRow}>
                    <Text style={styles.infoLabel}>BD Expenses</Text>
                    <Text style={styles.infoValue}>₹{calculated.bdExpenses.toLocaleString('en-IN')}</Text>
                  </View>
                )}
                {calculated.goodwillAmt > 0 && (
                  <View style={styles.expenseSummaryRow}>
                    <Text style={styles.infoLabel}>Goodwill</Text>
                    <Text style={styles.infoValue}>₹{calculated.goodwillAmt.toLocaleString('en-IN')}</Text>
                  </View>
                )}
              </View>
            )}

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Deal Information</Text>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Deal Type:</Text>
                <View style={intercityDeals === 'Yes' ? styles.intercityBadgeYes : styles.intercityBadgeNo}>
                  <Text style={intercityDeals === 'Yes' ? styles.intercityTextYes : styles.intercityTextNo}>
                    {intercityDeals === 'Yes' ? 'Intercity' : 'Local'}
                  </Text>
                </View>
              </View>
              {intercityDeals === 'Yes' && selectedCity && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>City:</Text>
                  <Text style={styles.infoValue}>{selectedCity === 'Other' ? customCity : selectedCity}</Text>
                </View>
              )}
              {intercityDeals === 'Yes' && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Intercity Amount (50%):</Text>
                  <Text style={styles.infoValue}>₹{calculated.intercityAmount.toLocaleString('en-IN')}</Text>
                </View>
              )}
            </View>

            <View style={styles.infoCard}>
              <Text style={styles.infoCardTitle}>📋 Important Note</Text>
              <Text style={styles.infoCardText}>
                Your final earnings will be calculated by BUP team after reviewing all details.
              </Text>
            </View>

            <LinearGradient
              colors={['#075E54', '#075E54']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[
                styles.submitButton,
                loading && styles.submitButtonDisabled
              ]}
            >
              <TouchableOpacity
                onPress={createIncentive}
                disabled={loading}
                style={styles.submitButtonTouchable}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color={colors.white} size="small" />
                ) : (
                  <Text style={styles.submitButtonText}>Submit Incentive</Text>
                )}
              </TouchableOpacity>
            </LinearGradient>
            <View style={{ height: 100 }} />
          </ScrollView>
        </View>
      );
    }

    return (
      <View style={styles.container}>
        {!hideHeader && (
          <>
            <StatusBar barStyle="light-content" backgroundColor="#075E54" />
            {/* ADDED: Green Header */}
            <GreenHeader />
            <View style={[styles.header, styles.headerWithGreen]}>
              <TouchableOpacity style={styles.backButton} onPress={onBack}>
                <BackIcon />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Checklist for Incentive</Text>
              <View style={styles.headerSpacer} />
            </View>
          </>
        )}
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Create Incentive</Text>
            <Text style={styles.leadNameLarge}>Lead: {leadName}</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Gross Income Received *</Text>
              <TextInput
                style={styles.input}
                value={grossIncome}
                onChangeText={handleGrossIncomeChange}
                placeholder="Enter amount (e.g., 1,00,000)"
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Select Expenses (Optional)</Text>
            <Text style={styles.expenseInfoText}>
              Check the expenses that apply and enter their amounts
            </Text>
            {EXPENSE_OPTIONS.map((option) => (
              <View key={option.key} style={styles.expenseItem}>
                <TouchableOpacity
                  style={styles.checkboxContainer}
                  onPress={() => toggleExpense(option.key)}
                >
                  <View style={[styles.checkbox, selectedExpenses.has(option.key) && styles.checkboxChecked]}>
                    {selectedExpenses.has(option.key) && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <Text style={styles.expenseLabel}>{option.label}</Text>
                </TouchableOpacity>
                {selectedExpenses.has(option.key) && (
                  <TextInput
                    style={styles.expenseInput}
                    value={expenseValues[option.key]}
                    onChangeText={(text) => handleExpenseChange(option.key, text)}
                    placeholder="Enter amount"
                    keyboardType="numeric"
                  />
                )}
              </View>
            ))}
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Intercity Deal? *</Text>
            <TouchableOpacity
              style={styles.dropdown}
              onPress={() => setShowIntercityDropdown(!showIntercityDropdown)}
            >
              <Text style={styles.dropdownText}>{intercityDeals}</Text>
              <Text style={styles.dropdownArrow}>{showIntercityDropdown ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {showIntercityDropdown && (
              <View style={styles.dropdownMenu}>
                {['Yes', 'No'].map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={styles.dropdownItem}
                    onPress={() => {
                      setIntercityDeals(option);
                      setShowIntercityDropdown(false);
                      if (option === 'No') {
                        setSelectedCity('');
                        setCustomCity('');
                      }
                    }}
                  >
                    <Text style={[styles.dropdownItemText, intercityDeals === option && styles.selectedText]}>
                      {option}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {intercityDeals === 'Yes' && (
            <View style={styles.card}>
              <Text style={styles.label}>Select City *</Text>
              <TouchableOpacity
                style={styles.dropdown}
                onPress={() => setShowCityDropdown(!showCityDropdown)}
              >
                <Text style={styles.dropdownText}>{selectedCity || 'Select a city'}</Text>
                <Text style={styles.dropdownArrow}>{showCityDropdown ? '▲' : '▼'}</Text>
              </TouchableOpacity>
              {showCityDropdown && (
                <View style={styles.dropdownMenu}>
                  {INTERCITY_CITIES.map((city) => (
                    <TouchableOpacity
                      key={city}
                      style={styles.dropdownItem}
                      onPress={() => {
                        setSelectedCity(city);
                        setShowCityDropdown(false);
                        if (city !== 'Other') {
                          setCustomCity('');
                        }
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
                  style={[styles.input, { marginTop: spacing.md }]}
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
            style={styles.continueButton}
          >
            <TouchableOpacity
              onPress={handleContinue}
              style={styles.gradientTouchable}
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

  if (!incentiveData) {
    return (
      <View style={styles.container}>
        {!hideHeader && (
          <>
            <StatusBar barStyle="light-content" backgroundColor="#075E54" />
            {/* ADDED: Green Header */}
            <GreenHeader />
            <View style={[styles.header, styles.headerWithGreen]}>
              <TouchableOpacity style={styles.backButton} onPress={onBack}>
                <BackIcon />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Incentive Checklist</Text>
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

  return (
    <View style={styles.container}>
      {!hideHeader && (
        <>
          <StatusBar barStyle="light-content" backgroundColor="#075E54" />
          {/* ADDED: Green Header */}
          <GreenHeader />
          <View style={[styles.header, styles.headerWithGreen]}>
            <TouchableOpacity style={styles.backButton} onPress={onBack}>
              <BackIcon />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Incentive Checklist</Text>
            <View style={styles.headerSpacer} />
          </View>
        </>
      )}
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
          {incentiveData.referral_amt > 0 && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Referral Amount:</Text>
              <Text style={styles.infoValue}>{formatCurrency(incentiveData.referral_amt)}</Text>
            </View>
          )}
          {incentiveData.goodwill > 0 && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Goodwill:</Text>
              <Text style={styles.infoValue}>{formatCurrency(incentiveData.goodwill)}</Text>
            </View>
          )}
          {incentiveData.bdt_expenses > 0 && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>BD Expenses:</Text>
              <Text style={styles.infoValue}>{formatCurrency(incentiveData.bdt_expenses)}</Text>
            </View>
          )}
          <View style={styles.infoRow}>
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
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Earnings Breakdown</Text>
          <View style={styles.calculationRow}>
            <Text style={styles.calculationLabel}>Brokerage Amount (Gross)</Text>
            <Text style={styles.calculationValue}>{formatCurrency(incentiveData.gross_income_recieved)}</Text>
          </View>
          {incentiveData.referral_amt > 0 && (
            <View style={styles.calculationRow}>
              <Text style={styles.calculationLabel}>Less: Referral Fee</Text>
              <Text style={[styles.calculationValue, styles.negativeValue]}>
                - {formatCurrency(incentiveData.referral_amt)}
              </Text>
            </View>
          )}
          {incentiveData.bdt_expenses > 0 && (
            <View style={styles.calculationRow}>
              <Text style={styles.calculationLabel}>Less: BD Expenses</Text>
              <Text style={[styles.calculationValue, styles.negativeValue]}>
                - {formatCurrency(incentiveData.bdt_expenses)}
              </Text>
            </View>
          )}
          {incentiveData.goodwill > 0 && (
            <View style={styles.calculationRow}>
              <Text style={styles.calculationLabel}>Less: Goodwill</Text>
              <Text style={[styles.calculationValue, styles.negativeValue]}>
                - {formatCurrency(incentiveData.goodwill)}
              </Text>
            </View>
          )}
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
          {incentiveData.bdt_share !== null && (
            <>
              {incentiveData.final_amount_payable !== null && (
                <View style={[styles.calculationRow, styles.finalRow]}>
                  <Text style={styles.finalLabel}>Net Amount (before TDS)</Text>
                  <Text style={styles.finalValue}>To be Calculated</Text>
                </View>
              )}
              <View style={styles.calculationRow}>
                <Text style={styles.calculationLabel}>Less: TDS</Text>
                <Text style={[styles.calculationValue, styles.tdsPlaceholder]}>
                  - will be added
                </Text>
              </View>
            </>
          )}
          {(incentiveData.bdt_share === null || incentiveData.final_amount_payable === null) && (
            <View style={[styles.calculationRow, styles.finalRow]}>
              <Text style={styles.finalLabel}>Your earning will be told by BUP</Text>
            </View>
          )}
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
    marginTop:40
  },
  // ADDED: Style for header when using green header
  headerWithGreen: {
    backgroundColor: 'transparent',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,

  },
  // ADDED: Green header styles
  greenHeader: {
    paddingTop: 70,
    paddingBottom: 20,
    paddingHorizontal: spacing.lg,
  },
  greenHeaderContent: {
    marginTop: 20,
  },
  greenHeaderTitle: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.white,
    marginBottom: spacing.xs,
  },
  greenHeaderSubtitle: {
    fontSize: fontSize.md,
    color: colors.white,
    opacity: 0.9,
    fontWeight: '500',
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
  expenseInfoText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    fontStyle: 'italic',
  },
  expenseItem: {
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  checkboxChecked: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  checkmark: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  expenseLabel: {
    fontSize: fontSize.md,
    color: colors.text,
    fontWeight: '500',
  },
  expenseInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
    backgroundColor: colors.backgroundSecondary,
    marginTop: spacing.xs,
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
  expenseSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
  tdsPlaceholder: {
    color: colors.warning,
    fontStyle: 'italic',
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
    backgroundColor: colors.info + '15',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    marginTop: spacing.md,
    borderWidth: 2,
    borderColor: colors.info,
  },
  finalLabel: {
    fontSize: fontSize.md,
    color: colors.info,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  finalValue: {
    fontSize: fontSize.xl,
    color: colors.success,
    fontWeight: '700',
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
  continueButton: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    ...shadows.md,
  },
  gradientTouchable: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 16,
  },
  continueButtonText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  submitButton: {
    // Remove backgroundColor property
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    ...shadows.md,
    // Ensure gradient takes full height
    minHeight: 50, // Adjust as needed
  },
  submitButtonTouchable: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    // Make touchable area match button size
    paddingVertical: spacing.md,
  },
  submitButtonText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  submitButtonDisabled: {
    opacity: 0.7, // Adjust opacity for disabled state
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