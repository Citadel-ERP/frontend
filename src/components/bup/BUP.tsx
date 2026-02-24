import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  StatusBar,
  Alert,
  BackHandler,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Text,
  Image,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { BACKEND_URL } from '../../config/config';
import { BUPProps, Lead, ViewMode, ThemeColors, Pagination, FilterOption } from './types';
import { lightTheme, darkTheme } from './theme';
import Header from './header';
import Cities from './cities';
import LeadsListUpdated from './listUpdated';
import SearchAndFilter from './searchAndFilter';
import LeadDetails from './leadDetails';
import LeadDetailsInfo from './leadDetailsInfo';
import EditLead from './editDetails';
import CreateLead from './createLead';
import Incentive from './incentive'; // BUP's incentive component

const TOKEN_KEY = 'token_2';

interface BDT {
  employee_id: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  profile_picture: string | null;
}

const BUP: React.FC<BUPProps> = ({ onBack }) => {
  const insets = useSafeAreaInsets();
  const [viewMode, setViewMode] = useState<ViewMode>('city-selection');
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [token, setToken] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // BDT selection
  const [bdts, setBdts] = useState<BDT[]>([]);
  const [selectedBDT, setSelectedBDT] = useState<BDT | null>(null);
  const [isUnassignedMode, setIsUnassignedMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingBDTs, setLoadingBDTs] = useState(false);

  // List view
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [filterBy, setFilterBy] = useState('');
  const [filterValue, setFilterValue] = useState('');
  const [allPhases, setAllPhases] = useState<FilterOption[]>([]);
  const [allSubphases, setAllSubphases] = useState<FilterOption[]>([]);
  const [allAssignedTo, setAllAssignedTo] = useState<FilterOption[]>([]);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});

  // Detail view
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showLeadInfo, setShowLeadInfo] = useState(false);

  // ── Incentive create flow (same pattern as BDT.tsx) ──────────────────────
  const [incentiveCanCreate, setIncentiveCanCreate] = useState(false);
  const [pendingPaymentReceivedUpdate, setPendingPaymentReceivedUpdate] = useState<{
    leadData: Lead;
    editingEmails: string[];
    editingPhones: string[];
  } | null>(null);

  const totalLeads = useMemo(() => {
    if (!statusCounts || Object.keys(statusCounts).length === 0) return 0;
    return Object.values(statusCounts).reduce((sum, count) => sum + (Number(count) || 0), 0);
  }, [statusCounts]);

  const theme: ThemeColors = isDarkMode ? darkTheme : lightTheme;

  const filteredLeads = leads.filter(lead => {
    let matchesFilter = true;
    if (filterBy && filterValue) {
      if (filterBy === 'status') matchesFilter = lead.status === filterValue;
      else if (filterBy === 'phase') matchesFilter = lead.phase === filterValue;
      else if (filterBy === 'subphase') matchesFilter = lead.subphase === filterValue;
      else if (filterBy === 'assigned_to') matchesFilter = lead.assigned_to?.employee_id === filterValue;
    }
    return matchesFilter;
  });

  const filteredBDTs = useMemo(() => {
    if (!searchQuery.trim()) return bdts;
    const query = searchQuery.toLowerCase();
    return bdts.filter(bdt =>
      bdt.full_name.toLowerCase().includes(query) ||
      bdt.employee_id.toLowerCase().includes(query) ||
      bdt.email.toLowerCase().includes(query)
    );
  }, [bdts, searchQuery]);

  // ─── Back handler ─────────────────────────────────────────────────────────
  useEffect(() => {
    const handleBackPress = () => {
      if (showLeadInfo) { setShowLeadInfo(false); return true; }

      if (viewMode === 'incentive') {
        // If we opened incentive from edit mode (pending update), go back to edit
        setViewMode('detail');
        setIsEditMode(!!pendingPaymentReceivedUpdate);
        setPendingPaymentReceivedUpdate(null);
        setIncentiveCanCreate(false);
        return true;
      }
      if (viewMode === 'list') { handleBackToBDTSelection(); return true; }
      if (viewMode === 'bdt-selection') { handleBackToCitySelection(); return true; }
      if (viewMode === 'detail') {
        if (isEditMode) setIsEditMode(false);
        else handleBackToList();
        return true;
      }
      if (viewMode === 'create') { handleBackToList(); return true; }
      if (viewMode === 'city-selection') { if (onBack) { onBack(); return true; } }
      return false;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
    return () => backHandler.remove();
  }, [viewMode, isEditMode, onBack, showLeadInfo, pendingPaymentReceivedUpdate]);

  useEffect(() => {
    const checkDarkMode = async () => {
      try {
        const darkMode = await AsyncStorage.getItem('dark_mode');
        setIsDarkMode(darkMode === 'true');
      } catch {}
    };
    checkDarkMode();
  }, []);

  useEffect(() => {
    const getToken = async () => {
      try {
        const API_TOKEN = await AsyncStorage.getItem(TOKEN_KEY);
        setToken(API_TOKEN);
      } catch {}
    };
    getToken();
  }, []);

  useEffect(() => {
    if (token && (selectedBDT || isUnassignedMode) && viewMode === 'list') {
      fetchLeads(1);
      fetchPhases();
      fetchAssignedToOptions();
      if (!isUnassignedMode) fetchStatusCounts();
    }
  }, [token, selectedBDT, isUnassignedMode, viewMode]);

  const fetchBDTs = async (city: string): Promise<void> => {
    try {
      if (!token) return;
      setLoadingBDTs(true);
      const response = await fetch(`${BACKEND_URL}/manager/getBDT`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, city })
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      setBdts(data.bdt || []);
    } catch (error) {
      console.error('Error fetching BDTs:', error);
      Alert.alert('Error', 'Failed to fetch BDTs. Please try again.');
    } finally {
      setLoadingBDTs(false);
    }
  };

  const fetchStatusCounts = async (): Promise<void> => {
    try {
      if (!token || !selectedBDT) return;
      const response = await fetch(`${BACKEND_URL}/manager/getLeadStatusCounts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, bdt_emp_id: selectedBDT.employee_id })
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      setStatusCounts(data.status_counts || {});
    } catch {
      setStatusCounts({});
    }
  };

  const toggleDarkMode = async () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    await AsyncStorage.setItem('dark_mode', newDarkMode.toString());
  };

  const fetchUnassignedLeads = async (): Promise<void> => {
    try {
      if (!token) return;
      setLoading(true);
      const response = await fetch(`${BACKEND_URL}/manager/getUnassignedLeads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, city: selectedCity })
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      const transformedLeads = data.leads.map((lead: any) => ({
        ...lead, createdAt: lead.created_at, collaborators: [], comments: []
      }));
      setLeads(transformedLeads);
      setPagination(null);
      setIsSearchMode(false);
      setStatusCounts({});
    } catch (error) {
      console.error('Error fetching unassigned leads:', error);
      Alert.alert('Error', 'Failed to fetch unassigned leads. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchLeads = async (page: number = 1, append: boolean = false): Promise<void> => {
    try {
      if (!token) return;
      if (isUnassignedMode) { fetchUnassignedLeads(); return; }
      if (!selectedBDT) return;

      if (!append) setLoading(true);
      else setLoadingMore(true);

      const requestBody: any = { token, bdt_emp_id: selectedBDT.employee_id, page };
      if (filterBy && filterValue) requestBody.filters = { [filterBy]: filterValue };

      const response = await fetch(`${BACKEND_URL}/manager/getLeads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      const transformedLeads = data.leads.map((lead: any) => ({
        ...lead, createdAt: lead.created_at, collaborators: [], comments: []
      }));

      if (append) setLeads(prevLeads => [...prevLeads, ...transformedLeads]);
      else setLeads(transformedLeads);

      setPagination(data.pagination || null);
      setIsSearchMode(false);
    } catch (error) {
      console.error('Error fetching leads:', error);
      Alert.alert('Error', 'Failed to fetch leads. Please try again.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  };

  const fetchPhases = async (): Promise<void> => {
    try {
      const response = await fetch(`${BACKEND_URL}/manager/getAllPhases`, {
        method: 'GET', headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      const beautifyName = (name: string) =>
        name.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
      setAllPhases(data.phases.map((phase: string) => ({ value: phase, label: beautifyName(phase) })));
    } catch {
      setAllPhases([]);
    }
  };

  const fetchSubphases = async (phase: string): Promise<void> => {
    try {
      const response = await fetch(`${BACKEND_URL}/manager/getAllSubphases?phase=${encodeURIComponent(phase)}`, {
        method: 'GET', headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      const beautifyName = (name: string) =>
        name.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
      setAllSubphases(data.subphases.map((subphase: string) => ({ value: subphase, label: beautifyName(subphase) })));
    } catch {
      setAllSubphases([]);
    }
  };

  const fetchAssignedToOptions = async (): Promise<void> => {
    try {
      if (!token) return;
      const response = await fetch(`${BACKEND_URL}/manager/getUsers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      setAllAssignedTo(data.users.map((user: any) => ({
        value: user.employee_id,
        label: `${user.first_name} ${user.last_name}`
      })));
    } catch {
      setAllAssignedTo([]);
    }
  };

  const searchLeads = async (query: string): Promise<void> => {
    if (!query.trim()) { setIsSearchMode(false); fetchLeads(1); return; }
    try {
      setLoading(true);
      setIsSearchMode(true);
      const response = await fetch(`${BACKEND_URL}/manager/searchLead?query=${encodeURIComponent(query)}`, {
        method: 'GET', headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      const transformedLeads = data.leads.map((lead: any) => ({
        ...lead, createdAt: lead.created_at, collaborators: [], comments: []
      }));
      setLeads(transformedLeads);
      setPagination(null);
    } catch (error) {
      console.error('Error searching leads:', error);
      Alert.alert('Error', 'Failed to search leads. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (query: string) => { setSearchQuery(query); searchLeads(query); };
  const handleFilter = (filterBy: string, filterValue: string) => { setFilterBy(filterBy); setFilterValue(filterValue); };

  const handleLoadMore = useCallback(() => {
    if (isUnassignedMode) return;
    if (pagination && pagination.has_next && !loadingMore && !isSearchMode) {
      fetchLeads(pagination.current_page + 1, true);
    }
  }, [pagination, loadingMore, isSearchMode, isUnassignedMode]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    if (isSearchMode) searchLeads(searchQuery);
    else {
      fetchLeads(1);
      if (!isUnassignedMode) fetchStatusCounts();
    }
  }, [isSearchMode, searchQuery, isUnassignedMode]);

  const handleCitySelection = async (city: string) => {
    setSelectedCity(city);
    setViewMode('bdt-selection');
    await fetchBDTs(city);
  };

  const handleBDTSelection = (bdt: BDT) => {
    setSelectedBDT(bdt);
    setIsUnassignedMode(false);
    setViewMode('list');
  };

  const handleUnassignedSelection = () => {
    setSelectedBDT(null);
    setIsUnassignedMode(true);
    setViewMode('list');
  };

  const handleLeadPress = (lead: Lead) => {
    setSelectedLead({ ...lead });
    setViewMode('detail');
    setIsEditMode(false);
    setShowLeadInfo(false);
  };

  const handleBackToList = useCallback(() => {
    setViewMode('list');
    setSelectedLead(null);
    setIsEditMode(false);
    setShowLeadInfo(false);
    fetchLeads(1);
    if (!isUnassignedMode) fetchStatusCounts();
  }, [isUnassignedMode]);

  const handleBackToBDTSelection = useCallback(() => {
    setViewMode('bdt-selection');
    setSelectedBDT(null);
    setIsUnassignedMode(false);
    setLeads([]);
    setSearchQuery('');
    setFilterBy('');
    setFilterValue('');
    setIsSearchMode(false);
    setStatusCounts({});
    setShowLeadInfo(false);
  }, []);

  const handleBackToCitySelection = useCallback(() => {
    setViewMode('city-selection');
    setSelectedCity('');
    setBdts([]);
    setSelectedBDT(null);
    setIsUnassignedMode(false);
    setLeads([]);
    setSearchQuery('');
    setFilterBy('');
    setFilterValue('');
    setIsSearchMode(false);
    setStatusCounts({});
    setShowLeadInfo(false);
  }, []);

  const handleEditPress = () => setIsEditMode(true);
  const handleCreateLead = () => setViewMode('create');
  const handleOpenLeadInfo = (lead: Lead) => { setSelectedLead(lead); setShowLeadInfo(true); };
  const handleCloseLeadInfo = () => setShowLeadInfo(false);

  const updateLead = async (leadData: Partial<Lead>, emails: string[], phones: string[]): Promise<boolean> => {
    try {
      if (!token || !selectedLead) return false;
      setLoading(true);

      const updatePayload: any = { token, lead_id: selectedLead.id };
      if (emails.length > 0) updatePayload.emails = emails;
      if (phones.length > 0) updatePayload.phone_numbers = phones;
      if (leadData.name !== undefined) updatePayload.name = leadData.name;
      if (leadData.company !== undefined) updatePayload.company = leadData.company;
      if (leadData.status !== undefined) updatePayload.status = leadData.status;
      if (leadData.phase !== undefined) updatePayload.phase = leadData.phase;
      if (leadData.subphase !== undefined) updatePayload.subphase = leadData.subphase;
      if (leadData.city !== undefined) updatePayload.city = leadData.city;
      if (leadData.assigned_to !== undefined) {
        updatePayload.assigned_to = leadData.assigned_to?.employee_id || leadData.assigned_to?.email;
      }
      if (leadData.meta !== undefined && leadData.meta !== null) updatePayload.meta = leadData.meta;

      const response = await fetch(`${BACKEND_URL}/manager/updateLead`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const updatedLead = { ...data.lead, createdAt: data.lead.created_at, collaborators: [], comments: [] };
      setSelectedLead(updatedLead);
      setLeads(prevLeads => prevLeads.map(lead => lead.id === selectedLead.id ? updatedLead : lead));
      Alert.alert('Success', 'Lead updated successfully!');
      return true;
    } catch (error: any) {
      console.error('Error updating lead:', error);
      Alert.alert('Error', error.message || 'Failed to update lead. Please try again.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // ─── Check if incentive already exists for a lead ─────────────────────────
  const checkExistingIncentive = async (leadId: number): Promise<boolean> => {
    try {
      if (!token) return false;
      const response = await fetch(`${BACKEND_URL}/manager/getIncentive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, lead_id: leadId })
      });
      // Returns 200 if incentive exists
      return response.ok;
    } catch {
      return false;
    }
  };

  // ─── Called after BUP creates a new incentive from the create-flow ────────
  const handleIncentiveCreatedFromEdit = useCallback(async () => {
    if (!pendingPaymentReceivedUpdate) return;
    const { leadData, editingEmails, editingPhones } = pendingPaymentReceivedUpdate;
    const success = await updateLead(leadData, editingEmails, editingPhones);
    if (success) {
      setIsEditMode(false);
      setPendingPaymentReceivedUpdate(null);
      setIncentiveCanCreate(false);
      setViewMode('detail');
      if (!isUnassignedMode) fetchStatusCounts();
    }
  }, [pendingPaymentReceivedUpdate, updateLead, isUnassignedMode]);

  // ─── handleSaveLead: intercept payment_received subphase ─────────────────
  const handleSaveLead = async (updatedLead: Lead, editingEmails: string[], editingPhones: string[]) => {
    if (updatedLead.subphase === 'payment_received') {
      // Check if an incentive already exists
      const incentiveExists = await checkExistingIncentive(updatedLead.id);

      if (!incentiveExists) {
        // No incentive yet → BUP creates one before updating the lead
        setPendingPaymentReceivedUpdate({
          leadData: updatedLead,
          editingEmails,
          editingPhones,
        });
        setIncentiveCanCreate(true);
        setViewMode('incentive');
        return;
      }
      // Incentive exists (BDT already created it) → just update lead normally
    }

    const success = await updateLead(updatedLead, editingEmails, editingPhones);
    if (success) {
      setIsEditMode(false);
      if (!isUnassignedMode) fetchStatusCounts();
    }
  };

  const handleDeleteLead = async (leadId: number): Promise<boolean> => {
    try {
      if (!token) { Alert.alert('Error', 'Authentication token not found'); return false; }
      Alert.alert(
        'Delete Lead',
        'Are you sure you want to delete this lead? This action cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete', style: 'destructive',
            onPress: async () => {
              setLoading(true);
              try {
                const response = await fetch(`${BACKEND_URL}/manager/deleteLead`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ token, lead_id: leadId })
                });
                if (!response.ok) {
                  const errorData = await response.json();
                  throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                setLeads(prevLeads => prevLeads.filter(lead => lead.id !== leadId));
                if (selectedLead && selectedLead.id === leadId) setSelectedLead(null);
                Alert.alert('Success', data.message || 'Lead deleted successfully!');
                if (!isUnassignedMode) fetchStatusCounts();
                return true;
              } catch (error: any) {
                console.error('Error deleting lead:', error);
                Alert.alert('Error', error.message || 'Failed to delete lead. Please try again.');
                return false;
              } finally {
                setLoading(false);
              }
            }
          }
        ]
      );
      return false;
    } catch {
      return false;
    }
  };

  // ─── Back press for incentive view ───────────────────────────────────────
  const handleIncentiveBack = useCallback(() => {
    setViewMode('detail');
    setIsEditMode(!!pendingPaymentReceivedUpdate);
    setPendingPaymentReceivedUpdate(null);
    setIncentiveCanCreate(false);
  }, [pendingPaymentReceivedUpdate]);

  // ─── Render ───────────────────────────────────────────────────────────────
  const getHeaderTitle = () => {
    if (viewMode === 'incentive') return 'Incentive';
    if (viewMode === 'city-selection') return 'Select City';
    if (viewMode === 'bdt-selection') return `Select Transaction Team - ${selectedCity}`;
    if (viewMode === 'create') return 'Create New Lead';
    if (viewMode === 'detail') return 'Lead Details';
    if (showLeadInfo) return 'Lead Information';
    if (isUnassignedMode) return 'Unassigned Leads';
    return selectedBDT ? `${selectedBDT.full_name} - Leads` : 'Leads';
  };

  const getInitials = (name: string): string => {
    if (!name || name.trim().length === 0) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
  };

  const getAvatarColor = (name: string): string => {
    const avatarColors = ['#00d285', '#ff5e7a', '#ffb157', '#1da1f2', '#007AFF'];
    if (!name) return avatarColors[0];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return avatarColors[Math.abs(hash) % avatarColors.length];
  };

  const renderBDTSelection = () => (
    <View style={[styles.bdtContainer, { backgroundColor: theme.background }]}>
      {/* Search Bar */}
      <View style={[styles.searchBox, { backgroundColor: theme.background }]}>
        <View style={[
          styles.searchInputWrapper,
          { backgroundColor: theme.surface, borderColor: isDarkMode ? '#333' : '#E8ECF0', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 }
        ]}>
          <View style={styles.searchIconContainer}>
            <Ionicons name="search" size={17} color={theme.primary} />
          </View>
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search BDT by name or ID..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={theme.textSecondary}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
              <Ionicons name="close-circle" size={18} color={theme.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loadingBDTs ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.text }]}>Loading Transaction Team...</Text>
        </View>
      ) : filteredBDTs.length === 0 && searchQuery ? (
        <View style={styles.emptyState}>
          <View style={[styles.emptyIconWrap, { backgroundColor: isDarkMode ? '#2C2C2E' : '#F0F4F8' }]}>
            <Ionicons name="people-outline" size={38} color={theme.textSecondary} />
          </View>
          <Text style={[styles.emptyStateText, { color: theme.text }]}>No BDTs match your search</Text>
          <Text style={[styles.emptyStateSubtext, { color: theme.textSecondary }]}>Try adjusting your search</Text>
        </View>
      ) : (
        <FlatList
          data={filteredBDTs}
          keyExtractor={(item) => item.employee_id}
          ListHeaderComponent={() =>
            filteredBDTs.length > 0
              ? <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>
                  {filteredBDTs.length} TEAM MEMBER{filteredBDTs.length !== 1 ? 'S' : ''}
                </Text>
              : null
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.bdtItem, { backgroundColor: theme.surface, borderColor: isDarkMode ? '#2C2C2E' : '#F0F2F5' }]}
              onPress={() => handleBDTSelection(item)}
              activeOpacity={0.75}
            >
              <View style={[styles.bdtAvatar, { backgroundColor: getAvatarColor(item.full_name) }]}>
                {item.profile_picture
                  ? <Image source={{ uri: item.profile_picture }} style={styles.bdtProfileImage} />
                  : <Text style={styles.bdtAvatarText}>{getInitials(item.full_name)}</Text>
                }
              </View>
              <View style={styles.bdtContent}>
                <View style={styles.bdtHeader}>
                  <Text style={[styles.bdtName, { color: theme.text }]} numberOfLines={1}>{item.full_name}</Text>
                </View>
              </View>
              <View style={[styles.bdtArrowBtn, { backgroundColor: isDarkMode ? '#2C2C2E' : '#F4F6F9' }]}>
                <Ionicons name="chevron-forward" size={14} color={theme.primary} />
              </View>
            </TouchableOpacity>
          )}
          ListFooterComponent={() => (
            <TouchableOpacity
              style={[styles.unassignedItem, { backgroundColor: isDarkMode ? theme.surface : '#F7FFFC', borderColor: theme.primary }]}
              onPress={handleUnassignedSelection}
              activeOpacity={0.75}
            >
              <View style={[styles.unassignedAvatar, { backgroundColor: theme.primary + '18' }]}>
                <Ionicons name="person-outline" size={24} color={theme.primary} />
              </View>
              <View style={styles.bdtContent}>
                <View style={styles.bdtHeader}>
                  <Text style={[styles.bdtName, { color: theme.primary }]} numberOfLines={1}>Unassigned Leads</Text>
                </View>
                <View style={styles.bdtInfo}>
                  <Text style={[styles.bdtId, { color: theme.textSecondary }]} numberOfLines={1}>
                    View all leads without Transaction Team assignment
                  </Text>
                </View>
              </View>
              <View style={[styles.bdtArrowBtn, { backgroundColor: theme.primary + '18' }]}>
                <Ionicons name="chevron-forward" size={14} color={theme.primary} />
              </View>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.bdtListContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );

  const renderContent = () => {
    if (showLeadInfo && selectedLead) {
      return <LeadDetailsInfo lead={selectedLead} token={token} onBack={handleCloseLeadInfo} />;
    }

    switch (viewMode) {
      case 'city-selection':
        return <Cities onCitySelect={handleCitySelection} onBack={onBack} theme={theme} />;

      case 'bdt-selection':
        return renderBDTSelection();

      // ── Incentive create / review flow ──────────────────────────────────
      case 'incentive':
        if (!selectedLead) return null;
        return (
          <Incentive
            onBack={handleIncentiveBack}
            leadId={selectedLead.id}
            leadName={selectedLead.company}
            hideHeader={false}
            theme={theme}
            canCreate={incentiveCanCreate}
            onIncentiveCreated={
              pendingPaymentReceivedUpdate ? handleIncentiveCreatedFromEdit : undefined
            }
          />
        );

      case 'create':
        return (
          <CreateLead
            onBack={handleBackToList}
            onCreate={() => {
              fetchLeads(1);
              if (!isUnassignedMode) fetchStatusCounts();
              setViewMode('list');
            }}
            selectedCity={selectedCity}
            selectedBDT={selectedBDT}
            token={token}
            theme={theme}
            fetchSubphases={fetchSubphases}
          />
        );

      case 'detail':
        if (!selectedLead) return null;

        if (isEditMode) {
          return (
            <EditLead
              lead={selectedLead}
              onBack={() => setIsEditMode(false)}
              onSave={handleSaveLead}
              onDelete={async () => {
                try {
                  const success = await handleDeleteLead(selectedLead.id);
                  if (success) { setIsEditMode(false); handleBackToList(); }
                } catch {}
              }}
              token={token}
              theme={theme}
              fetchSubphases={fetchSubphases}
              selectedCity={selectedCity}
            />
          );
        }

        return (
          <LeadDetails
            lead={selectedLead}
            onBack={handleBackToList}
            onEdit={handleEditPress}
            token={token}
            theme={theme}
            onOpenLeadDetails={handleOpenLeadInfo}
          />
        );

      case 'list':
      default:
        return (
          <View style={{ flex: 1 }}>
            <ScrollView
              style={styles.scrollContainer}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled={true}
            >
              <Header
                title={getHeaderTitle()}
                {...getHeaderActions()}
                onThemeToggle={toggleDarkMode}
                isDarkMode={isDarkMode}
                theme={theme}
                loading={loading}
              />
              <SearchAndFilter
                token={token}
                onSearch={handleSearch}
                onFilter={handleFilter}
                theme={theme}
                allPhases={allPhases}
                allSubphases={allSubphases}
                allAssignedTo={allAssignedTo}
                fetchSubphases={fetchSubphases}
                selectedCity={selectedCity}
                onCreateLead={handleCreateLead}
                onBack={handleBackToBDTSelection}
                totalLeads={totalLeads}
                statusCounts={statusCounts}
              />
            </ScrollView>
            <View style={{ flex: 1 }}>
              <LeadsListUpdated
                leads={filteredLeads}
                onLeadPress={handleLeadPress}
                loading={loading}
                loadingMore={loadingMore}
                refreshing={refreshing}
                onLoadMore={handleLoadMore}
                onRefresh={handleRefresh}
                pagination={pagination}
                isSearchMode={isSearchMode}
                searchQuery={searchQuery}
                token={token}
                theme={theme}
                isDarkMode={isDarkMode}
              />
            </View>
          </View>
        );
    }
  };

  const getHeaderActions = () => {
    if (showLeadInfo) return { showBackButton: true, onBack: handleCloseLeadInfo, showThemeToggle: true };

    if (viewMode === 'city-selection') return { showBackButton: true, onBack: onBack, showThemeToggle: true };

    if (viewMode === 'bdt-selection') return { showBackButton: true, onBack: handleBackToCitySelection, showThemeToggle: true };

    if (viewMode === 'incentive') return { showBackButton: true, onBack: handleIncentiveBack, showThemeToggle: true };

    if (viewMode === 'list') return {
      showBackButton: true, onBack: handleBackToBDTSelection,
      showAddButton: true, onAddPress: handleCreateLead, addButtonText: 'Add', showThemeToggle: true,
    };

    if (viewMode === 'detail') {
      if (isEditMode) return { showBackButton: true, onBack: () => setIsEditMode(false), showSaveButton: false, showThemeToggle: true };
      return { showBackButton: true, onBack: handleBackToList, showEditButton: true, onEdit: handleEditPress, showThemeToggle: true };
    }

    if (viewMode === 'create') return { showBackButton: true, onBack: handleBackToList, showSaveButton: true, onSavePress: () => { }, showThemeToggle: true };

    return { showBackButton: true, onBack: onBack, showThemeToggle: true };
  };

  const headerActions = getHeaderActions();

  return (
    <View style={[styles.container, { backgroundColor: 'transparent' }]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {viewMode !== 'city-selection' && viewMode !== 'detail' && viewMode !== 'create'
        && viewMode !== 'list' && viewMode !== 'incentive' && !showLeadInfo && (
        <Header
          title={getHeaderTitle()}
          {...headerActions}
          onThemeToggle={toggleDarkMode}
          isDarkMode={isDarkMode}
          theme={theme}
          loading={loading}
        />
      )}

      <View style={{ flex: 1, paddingBottom: insets.bottom }}>
        {renderContent()}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 0 },
  scrollContainer: { flexGrow: 0 },
  scrollContent: { flexGrow: 0 },

  // BDT Selection
  bdtContainer: { flex: 1 },
  searchBox: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10 },
  searchInputWrapper: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 10, borderWidth: 1 },
  searchIconContainer: { width: 30, alignItems: 'center', justifyContent: 'center' },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 0, marginLeft: 2 },
  clearButton: { padding: 4 },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginBottom: 10, marginTop: 2 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 50 },
  loadingText: { marginTop: 12, fontSize: 14, fontWeight: '500' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, marginTop: -80 },
  emptyIconWrap: { width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyStateText: { fontSize: 17, fontWeight: '700', marginBottom: 6 },
  emptyStateSubtext: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  bdtListContent: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24 },
  bdtItem: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, paddingVertical: 12, paddingLeft: 14, paddingRight: 12, marginBottom: 10, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  unassignedItem: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, paddingVertical: 12, paddingLeft: 14, paddingRight: 12, marginTop: 6, marginBottom: 8, borderWidth: 1.5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  bdtAvatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginRight: 14, overflow: 'hidden' },
  unassignedAvatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  bdtProfileImage: { width: '100%', height: '100%', borderRadius: 24 },
  bdtAvatarText: { color: '#FFF', fontSize: 18, fontWeight: '700', textShadowColor: 'rgba(0,0,0,0.15)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  bdtContent: { flex: 1, justifyContent: 'center' },
  bdtHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  bdtName: { fontSize: 15, fontWeight: '600', flex: 1, marginRight: 8 },
  bdtInfo: { marginTop: 2 },
  bdtId: { fontSize: 12, fontWeight: '400', lineHeight: 16 },
  bdtArrowBtn: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
});

export default BUP;