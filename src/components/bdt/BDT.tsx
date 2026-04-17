/**
 * bdt/bdt.tsx  (updated)
 *
 * Key changes from the original:
 *  - Multiple invoices and incentives per lead are now fully supported.
 *  - New view modes:
 *      'invoice_list'   → InvoiceList  (list of invoices for selectedLead)
 *      'invoice_detail' → Invoice      (single invoice detail, preloaded)
 *      'invoice_create' → CreateInvoice (new screen-style create)
 *      'incentive_list' → IncentiveList (list of incentives for selectedLead)
 *      'incentive'      → Incentive    (single incentive detail by id)
 *  - LeadConfig is fetched after a lead is selected; it controls which
 *    action buttons are visible (show_invoice, can_create_invoice,
 *    show_incentive, can_create_incentive).
 *  - The old Modal-based CreateInvoice is removed entirely.
 *  - Incentive is no longer triggered by subphase === 'payment_received';
 *    it is driven by the config returned from the backend.
 *  - LeadDetails receives the config flags so it can render the correct
 *    action buttons in the header.
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  StyleSheet,
  StatusBar,
  Alert,
  BackHandler,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BACKEND_URL } from '../../config/config';
import { BDTProps, Lead, ViewMode, ThemeColors, Pagination, FilterOption } from './types';
import { lightTheme, darkTheme } from './theme';
import Header from './header';
import SearchAndFilter from './searchAndFilter';
import LeadsList from './list';
import LeadDetails from './leadDetails';
import EditLead from './editLead';
import Incentive from './incentive';
import IncentiveList from './incentiveList';
import InvoiceList, { InvoiceData } from './invoiceList';
import Invoice from './invoice';
import CreateInvoice from './createInvoice';
import CreateLead from './createLead';

const TOKEN_KEY = 'token_2';

// ─── Extended ViewMode ─────────────────────────────────────────────────────
// We extend the base ViewMode type locally to include the new list/detail modes.
type ExtendedViewMode =
  | ViewMode
  | 'invoice_list'
  | 'invoice_detail'
  | 'invoice_create'
  | 'incentive_list'
  | 'incentive';

// ─── Lead config from backend ──────────────────────────────────────────────
interface LeadConfig {
  show_invoice: boolean;
  can_create_invoice: boolean;
  show_incentive: boolean;
  can_create_incentive: boolean;
}

const DEFAULT_CONFIG: LeadConfig = {
  show_invoice: false,
  can_create_invoice: false,
  show_incentive: false,
  can_create_incentive: false,
};

// ─── Component ─────────────────────────────────────────────────────────────
const BDT: React.FC<BDTProps> = ({ onBack }) => {
  const insets = useSafeAreaInsets();

  // ── Core state ────────────────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<ExtendedViewMode>('list');
  const [token, setToken] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // ── Lead list state ───────────────────────────────────────────────────────
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [filterBy, setFilterBy] = useState('');
  const [filterValue, setFilterValue] = useState('');
  const [allPhases, setAllPhases] = useState<FilterOption[]>([]);
  const [allSubphases, setAllSubphases] = useState<FilterOption[]>([]);
  const [totalLeads, setTotalLeads] = useState<number>(0);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});

  // ── Selected lead state ───────────────────────────────────────────────────
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [leadConfig, setLeadConfig] = useState<LeadConfig>(DEFAULT_CONFIG);
  const [loadingConfig, setLoadingConfig] = useState(false);

  // ── Invoice state ─────────────────────────────────────────────────────────
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceData | null>(null);

  // ── Incentive state ───────────────────────────────────────────────────────
  const [selectedIncentiveId, setSelectedIncentiveId] = useState<number | null>(null);

  // ── Memoised theme ────────────────────────────────────────────────────────
  const theme: ThemeColors = useMemo(() => isDarkMode ? darkTheme : lightTheme, [isDarkMode]);

  // ── Boot ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      try {
        const [darkMode, apiToken] = await Promise.all([
          AsyncStorage.getItem('dark_mode'),
          AsyncStorage.getItem(TOKEN_KEY),
        ]);
        setIsDarkMode(darkMode === 'true');
        setToken(apiToken);
      } catch (error) {
        console.error('Error initialising BDT:', error);
      }
    };
    init();
  }, []);

  // ── Fetch helpers ──────────────────────────────────────────────────────────

  const fetchStatusCounts = useCallback(async (): Promise<void> => {
    if (!token) return;
    try {
      const response = await fetch(`${BACKEND_URL}/employee/getLeadStatusCounts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setStatusCounts(data.status_counts || {});
    } catch (error) {
      console.error('Error fetching status counts:', error);
      setStatusCounts({});
    }
  }, [token]);

  const fetchLeads = useCallback(async (page: number = 1, append: boolean = false): Promise<void> => {
    if (!token) return;
    if (!append) setLoading(true);
    else setLoadingMore(true);

    try {
      const response = await fetch(`${BACKEND_URL}/employee/getLeads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, page }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();

      const transformed = data.leads.map((lead: any) => ({
        ...lead,
        createdAt: lead.created_at,
        collaborators: [],
        comments: [],
      }));

      if (append) {
        setLeads(prev => [...prev, ...transformed]);
      } else {
        setLeads(transformed);
      }
      setPagination(data.pagination || null);
      setTotalLeads(data.total_leads || 0);
      setIsSearchMode(false);
    } catch (error) {
      console.error('Error fetching leads:', error);
      Alert.alert('Error', 'Failed to fetch leads. Please try again.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, [token]);

  const fetchPhases = useCallback(async (): Promise<void> => {
    try {
      const response = await fetch(`${BACKEND_URL}/employee/getAllPhases`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      const beautify = (name: string) =>
        name.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
      setAllPhases(data.phases.map((p: string) => ({ value: p, label: beautify(p) })));
    } catch (error) {
      console.error('Error fetching phases:', error);
      setAllPhases([]);
    }
  }, []);

  const fetchSubphases = useCallback(async (phase: string): Promise<void> => {
    try {
      const response = await fetch(
        `${BACKEND_URL}/employee/getAllSubphases?phase=${encodeURIComponent(phase)}`,
        { method: 'GET', headers: { 'Content-Type': 'application/json' } }
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      const beautify = (name: string) =>
        name.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
      setAllSubphases(data.subphases.map((sp: string) => ({ value: sp, label: beautify(sp) })));
    } catch (error) {
      console.error('Error fetching subphases:', error);
      setAllSubphases([]);
    }
  }, []);

  /**
   * Fetch the lead-level config that tells us which buttons to show.
   * Called every time a lead is opened.
   */
  const fetchLeadConfig = useCallback(async (leadId: number): Promise<void> => {
    if (!token) return;
    setLoadingConfig(true);
    try {
      const response = await fetch(`${BACKEND_URL}/employee/getLeadConfig`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, lead_id: leadId }),
      });
      if (!response.ok) {
        // Config endpoint not available or lead has no special config — use defaults
        setLeadConfig(DEFAULT_CONFIG);
        return;
      }
      const data = await response.json();
      setLeadConfig({
        show_invoice: data.show_invoice ?? false,
        can_create_invoice: data.can_create_invoice ?? false,
        show_incentive: data.show_incentive ?? false,
        can_create_incentive: data.can_create_incentive ?? false,
      });
    } catch (error) {
      console.error('Error fetching lead config:', error);
      setLeadConfig(DEFAULT_CONFIG);
    } finally {
      setLoadingConfig(false);
    }
  }, [token]);

  const searchLeads = useCallback(async (query: string): Promise<void> => {
    if (!query.trim()) {
      setIsSearchMode(false);
      fetchLeads(1);
      return;
    }
    try {
      setLoading(true);
      setIsSearchMode(true);
      const response = await fetch(`${BACKEND_URL}/employee/searchLeads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, query }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      const transformed = data.leads.map((lead: any) => ({
        ...lead,
        createdAt: lead.created_at,
        collaborators: [],
        comments: [],
      }));
      setLeads(transformed);
      setPagination(null);
    } catch (error) {
      console.error('Error searching leads:', error);
      Alert.alert('Error', 'Failed to search leads. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [token, fetchLeads]);

  // ── On-token boot ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (token) {
      fetchLeads(1);
      fetchPhases();
      fetchStatusCounts();
    }
  }, [token, fetchLeads, fetchPhases, fetchStatusCounts]);

  // ── Lead update helper ────────────────────────────────────────────────────
  const updateLead = useCallback(async (
    leadData: Partial<Lead>,
    emails: string[],
    phones: string[]
  ): Promise<boolean> => {
    if (!token || !selectedLead) return false;
    try {
      setLoading(true);
      const payload: any = { token, lead_id: selectedLead.id };
      if (emails.length > 0) payload.emails = emails;
      if (phones.length > 0) payload.phone_numbers = phones;
      if (leadData.status !== undefined) payload.status = leadData.status;
      if (leadData.phase !== undefined) payload.phase = leadData.phase;
      if (leadData.subphase !== undefined) payload.subphase = leadData.subphase;
      if (leadData.meta !== undefined && leadData.meta !== null) payload.meta = leadData.meta;

      const response = await fetch(`${BACKEND_URL}/employee/updateLead`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();

      const updatedLead = {
        ...data.lead,
        createdAt: data.lead.created_at,
        collaborators: selectedLead.collaborators || [],
        comments: selectedLead.comments || [],
      };

      setSelectedLead(updatedLead);
      setLeads(prev => prev.map(l => l.id === selectedLead.id ? updatedLead : l));
      await fetchStatusCounts();

      // Refresh config as subphase may have changed
      await fetchLeadConfig(selectedLead.id);

      Alert.alert('Success', 'Lead updated successfully!');
      return true;
    } catch (error) {
      console.error('Error updating lead:', error);
      Alert.alert('Error', 'Failed to update lead. Please try again.');
      return false;
    } finally {
      setLoading(false);
    }
  }, [token, selectedLead, fetchStatusCounts, fetchLeadConfig]);

  // ── Event handlers ────────────────────────────────────────────────────────

  const toggleDarkMode = useCallback(async () => {
    const next = !isDarkMode;
    setIsDarkMode(next);
    await AsyncStorage.setItem('dark_mode', next.toString());
  }, [isDarkMode]);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    searchLeads(query);
  }, [searchLeads]);

  const handleFilter = useCallback((by: string, value: string) => {
    setFilterBy(by);
    setFilterValue(value);
  }, []);

  const handleLoadMore = useCallback(() => {
    if (pagination?.has_next && !loadingMore && !isSearchMode) {
      fetchLeads(pagination.current_page + 1, true);
    }
  }, [pagination, loadingMore, isSearchMode, fetchLeads]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    if (isSearchMode) searchLeads(searchQuery);
    else fetchLeads(1);
  }, [isSearchMode, searchQuery, searchLeads, fetchLeads]);

  const handleLeadPress = useCallback((lead: Lead) => {
    setSelectedLead({ ...lead });
    setIsEditMode(false);
    setSelectedInvoice(null);
    setSelectedIncentiveId(null);
    setLeadConfig(DEFAULT_CONFIG);
    setViewMode('detail');
    // Fetch config in background — LeadDetails will reactively update
    fetchLeadConfig(lead.id);
  }, [fetchLeadConfig]);

  const handleCreateLead = useCallback(() => {
    setViewMode('create');
  }, []);

  // ── Navigation: Invoice ───────────────────────────────────────────────────

  const handleInvoiceListPress = useCallback(() => {
    setViewMode('invoice_list');
  }, []);

  const handleSelectInvoice = useCallback((invoice: InvoiceData) => {
    setSelectedInvoice(invoice);
    setViewMode('invoice_detail');
  }, []);

  const handleCreateInvoice = useCallback(() => {
    setViewMode('invoice_create');
  }, []);

  const handleInvoiceCreated = useCallback(async () => {
    // Refresh config (can_create_invoice may toggle)
    if (selectedLead) await fetchLeadConfig(selectedLead.id);
    setViewMode('invoice_list');
  }, [selectedLead, fetchLeadConfig]);

  // ── Navigation: Incentive ─────────────────────────────────────────────────

  const handleIncentiveListPress = useCallback(() => {
    setViewMode('incentive_list');
  }, []);

  const handleSelectIncentive = useCallback((incentiveId: number) => {
    setSelectedIncentiveId(incentiveId);
    setViewMode('incentive');
  }, []);

  const handleCreateIncentive = useCallback(() => {
    // canCreate=true, no incentiveId → blank create form
    setSelectedIncentiveId(null);
    setViewMode('incentive');
  }, []);

  const handleIncentiveCreated = useCallback(async () => {
    if (selectedLead) await fetchLeadConfig(selectedLead.id);
    setViewMode('incentive_list');
  }, [selectedLead, fetchLeadConfig]);

  // ── Save lead (from EditLead) ─────────────────────────────────────────────
  const handleSaveLead = useCallback(async (
    updatedLead: Lead,
    editingEmails: string[],
    editingPhones: string[]
  ) => {
    const success = await updateLead(updatedLead, editingEmails, editingPhones);
    if (success) setIsEditMode(false);
  }, [updateLead]);

  const handleLeadCreated = useCallback(async () => {
    setViewMode('list');
    await fetchLeads(1);
    await fetchStatusCounts();
  }, [fetchLeads, fetchStatusCounts]);

  // ── Back navigation ───────────────────────────────────────────────────────
  const handleBackPress = useCallback(() => {
    switch (viewMode) {
      case 'incentive':
        // Back to incentive list
        setSelectedIncentiveId(null);
        setViewMode('incentive_list');
        break;

      case 'incentive_list':
        // Back to lead detail
        setViewMode('detail');
        break;

      case 'invoice_detail':
        // Back to invoice list
        setSelectedInvoice(null);
        setViewMode('invoice_list');
        break;

      case 'invoice_create':
        // Back to invoice list (cancel handled inside CreateInvoice)
        setViewMode('invoice_list');
        break;

      case 'invoice_list':
        // Back to lead detail
        setViewMode('detail');
        break;

      case 'detail':
        if (isEditMode) {
          setIsEditMode(false);
        } else {
          setViewMode('list');
          setSelectedLead(null);
          setLeadConfig(DEFAULT_CONFIG);
          fetchLeads(1);
        }
        break;

      case 'create':
        setViewMode('list');
        break;

      case 'list':
      default:
        onBack();
        break;
    }
  }, [viewMode, isEditMode, fetchLeads, onBack]);

  // Android hardware back
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      handleBackPress();
      return true;
    });
    return () => sub.remove();
  }, [handleBackPress]);

  // ── Derived: filtered leads ───────────────────────────────────────────────
  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      if (!filterBy || !filterValue) return true;
      if (filterBy === 'status') return lead.status === filterValue;
      if (filterBy === 'phase') return lead.phase === filterValue;
      if (filterBy === 'subphase') return lead.subphase === filterValue;
      return true;
    });
  }, [leads, filterBy, filterValue]);

  // ── Header title ──────────────────────────────────────────────────────────
  const getHeaderTitle = () => {
    switch (viewMode) {
      case 'incentive': return 'Incentive';
      case 'incentive_list': return 'Incentives';
      case 'invoice_detail': return 'Invoice Details';
      case 'invoice_list': return 'Invoices';
      case 'invoice_create': return 'Create Invoice';
      case 'detail': return 'Lead Details';
      case 'create': return 'Create New Lead';
      default: return 'BDT';
    }
  };

  // ── Render content ────────────────────────────────────────────────────────
  const renderContent = () => {

    // ── Incentive single view ───────────────────────────────────────────────
    // In renderContent(), find the 'incentive' view mode block and update:
    if (viewMode === 'incentive' && selectedLead) {
      return (
        <Incentive
          onBack={handleBackPress}
          leadId={selectedLead.id}
          leadName={selectedLead.company}
          hideHeader={false}
          incentiveId={selectedIncentiveId ?? undefined}  // ← ADD THIS
          canCreate={selectedIncentiveId == null && leadConfig.can_create_incentive}
          onIncentiveCreated={
            selectedIncentiveId == null ? handleIncentiveCreated : undefined
          }
        />
      );
    }

    // ── Incentive list ──────────────────────────────────────────────────────
    if (viewMode === 'incentive_list' && selectedLead) {
      return (
        <IncentiveList
          leadId={selectedLead.id}
          leadName={selectedLead.company}
          token={token}
          theme={theme}
          onBack={handleBackPress}
          onSelectIncentive={handleSelectIncentive}
          onCreateIncentive={handleCreateIncentive}
          canCreate={leadConfig.can_create_incentive}
        />
      );
    }

    // ── Invoice detail ──────────────────────────────────────────────────────
    if (viewMode === 'invoice_detail' && selectedLead) {
      return (
        <Invoice
          leadId={selectedLead.id}
          leadName={selectedLead.company}
          token={token}
          theme={theme}
          onBack={handleBackPress}
          preloadedInvoice={selectedInvoice ?? undefined}
        />
      );
    }

    // ── Invoice create ──────────────────────────────────────────────────────
    if (viewMode === 'invoice_create' && selectedLead) {
      return (
        <CreateInvoice
          leadId={selectedLead.id}
          leadName={selectedLead.company}
          token={token}
          theme={theme}
          onBack={handleBackPress}
          onCreated={handleInvoiceCreated}
        />
      );
    }

    // ── Invoice list ────────────────────────────────────────────────────────
    if (viewMode === 'invoice_list' && selectedLead) {
      return (
        <InvoiceList
          leadId={selectedLead.id}
          leadName={selectedLead.company}
          token={token}
          theme={theme}
          onBack={handleBackPress}
          onSelectInvoice={handleSelectInvoice}
          onCreateInvoice={handleCreateInvoice}
          canCreate={leadConfig.can_create_invoice}
        />
      );
    }

    // ── Lead detail ─────────────────────────────────────────────────────────
    if (viewMode === 'detail' && selectedLead) {
      if (isEditMode) {
        return (
          <EditLead
            lead={selectedLead}
            onBack={handleBackPress}
            onSave={handleSaveLead}
            token={token}
            theme={theme}
            fetchSubphases={fetchSubphases}
          />
        );
      }
      return (
        <LeadDetails
          lead={selectedLead}
          onBack={handleBackPress}
          onEdit={() => setIsEditMode(true)}
          onInvoicePress={leadConfig.show_invoice ? handleInvoiceListPress : undefined}
          onIncentivePress={leadConfig.show_incentive ? handleIncentiveListPress : undefined}
          token={token}
          theme={theme}
        />
      );
    }

    // ── Create lead ─────────────────────────────────────────────────────────
    if (viewMode === 'create') {
      return (
        <CreateLead
          onBack={handleBackPress}
          onCreate={handleLeadCreated}
          token={token}
          theme={theme}
          fetchSubphases={fetchSubphases}
        />
      );
    }

    // ── Default: leads list ─────────────────────────────────────────────────
    return (
      <View style={styles.listContainer}>
        <SearchAndFilter
          token={token}
          onSearch={handleSearch}
          onFilter={handleFilter}
          theme={theme}
          allPhases={allPhases}
          allSubphases={allSubphases}
          fetchSubphases={fetchSubphases}
          totalLeads={totalLeads}
          statusCounts={statusCounts}
        />
        <LeadsList
          leads={filteredLeads}
          onLeadPress={handleLeadPress}
          loading={loading}
          loadingMore={loadingMore}
          refreshing={refreshing}
          onLoadMore={handleLoadMore}
          onRefresh={handleRefresh}
          token={token}
          theme={theme}
          isDarkMode={isDarkMode}
        />
      </View>
    );
  };

  // ── Header actions ────────────────────────────────────────────────────────
  const getHeaderActions = () => {
    // Sub-screens that own their own header — we hide the parent header for them
    const SELF_HEADED: ExtendedViewMode[] = [
      'invoice_list', 'invoice_detail', 'invoice_create',
      'incentive_list', 'incentive',
    ];
    if (SELF_HEADED.includes(viewMode)) return null;

    if (viewMode === 'list') {
      return {
        showBackButton: true,
        onBack: handleBackPress,
        showAddButton: true,
        onAddPress: handleCreateLead,
        addButtonText: 'Add',
        showThemeToggle: true,
        onThemeToggle: toggleDarkMode,
      };
    }

    if (viewMode === 'detail') {
      if (isEditMode) {
        return {
          showBackButton: true,
          onBack: () => setIsEditMode(false),
          showThemeToggle: true,
          onThemeToggle: toggleDarkMode,
        };
      }
      return {
        showBackButton: true,
        onBack: handleBackPress,
        showEditButton: true,
        onEdit: () => setIsEditMode(true),
        showThemeToggle: true,
        onThemeToggle: toggleDarkMode,
      };
    }

    if (viewMode === 'create') {
      return {
        showBackButton: true,
        onBack: handleBackPress,
        showThemeToggle: true,
        onThemeToggle: toggleDarkMode,
      };
    }

    return {
      showBackButton: true,
      onBack: handleBackPress,
      showThemeToggle: true,
      onThemeToggle: toggleDarkMode,
    };
  };

  const headerActions = getHeaderActions();

  // Sub-screens that own their own full-screen header — skip the parent Header
  const SELF_HEADED: ExtendedViewMode[] = [
    'invoice_list', 'invoice_detail', 'invoice_create',
    'incentive_list', 'incentive',
    'detail', 'create',
  ];
  const showParentHeader = !SELF_HEADED.includes(viewMode);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent
      />

      {showParentHeader && headerActions && (
        <Header
          title={getHeaderTitle()}
          {...headerActions}
          isDarkMode={isDarkMode}
          theme={theme}
          loading={loading}
        />
      )}

      <View style={[styles.contentContainer, { paddingBottom: insets.bottom }]}>
        {renderContent()}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContainer: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
  },
});

export default BDT;