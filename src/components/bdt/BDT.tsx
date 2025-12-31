import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Alert,
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
import CreateInvoice from './createInvoice';

const TOKEN_KEY = 'token_2';

const BDT: React.FC<BDTProps> = ({ onBack }) => {
  const insets = useSafeAreaInsets();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [token, setToken] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [pendingLeadUpdate, setPendingLeadUpdate] = useState<any>(null);
  const [totalLeads, setTotalLeads] = useState<number>(0);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});

  // State for list view
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

  const theme: ThemeColors = isDarkMode ? darkTheme : lightTheme;

  useEffect(() => {
    const checkDarkMode = async () => {
      try {
        const darkMode = await AsyncStorage.getItem('dark_mode');
        setIsDarkMode(darkMode === 'true');
      } catch (error) {
        console.error('Error checking dark mode:', error);
      }
    };
    checkDarkMode();
  }, []);

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
      fetchLeads(1);
      fetchPhases();
      fetchStatusCounts();
    }
  }, [token]);

  const toggleDarkMode = async () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    await AsyncStorage.setItem('dark_mode', newDarkMode.toString());
  };
  const fetchStatusCounts = async (): Promise<void> => {
    try {
      if (!token) return;

      const response = await fetch(`${BACKEND_URL}/employee/getLeadStatusCounts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setStatusCounts(data.status_counts || {});
    } catch (error) {
      console.error('Error fetching status counts:', error);
      setStatusCounts({});
    }
  };

  const fetchLeads = async (page: number = 1, append: boolean = false): Promise<void> => {
    try {
      if (!token) return;
      if (!append) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const response = await fetch(`${BACKEND_URL}/employee/getLeads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: token,
          page: page
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      const transformedLeads = data.leads.map((lead: any) => ({
        ...lead,
        createdAt: lead.created_at,
        collaborators: [],
        comments: []
      }));

      if (append) {
        setLeads(prevLeads => [...prevLeads, ...transformedLeads]);
      } else {
        setLeads(transformedLeads);
      }

      setPagination(data.pagination || null);
      setTotalLeads(data.total_leads || 0); // Add this line
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
      const response = await fetch(`${BACKEND_URL}/employee/getAllPhases`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const beautifyName = (name: string): string => {
        return name
          .split('_')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ');
      };
      setAllPhases(data.phases.map((phase: string) => ({ value: phase, label: beautifyName(phase) })));
    } catch (error) {
      console.error('Error fetching phases:', error);
      setAllPhases([]);
    }
  };

  const fetchSubphases = async (phase: string): Promise<void> => {
    try {
      const response = await fetch(`${BACKEND_URL}/employee/getAllSubphases?phase=${encodeURIComponent(phase)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const beautifyName = (name: string): string => {
        return name
          .split('_')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ');
      };
      setAllSubphases(data.subphases.map((subphase: string) => ({ value: subphase, label: beautifyName(subphase) })));
    } catch (error) {
      console.error('Error fetching subphases:', error);
      setAllSubphases([]);
    }
  };

  const searchLeads = async (query: string): Promise<void> => {
    if (!query.trim()) {
      setIsSearchMode(false);
      fetchLeads(1);
      return;
    }

    try {
      setLoading(true);
      setIsSearchMode(true);

      const response = await fetch(`${BACKEND_URL}/employee/searchLeads?query=${encodeURIComponent(query)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      const transformedLeads = data.leads.map((lead: any) => ({
        ...lead,
        createdAt: lead.created_at,
        collaborators: [],
        comments: []
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

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    searchLeads(query);
  };

  const handleFilter = (filterBy: string, filterValue: string) => {
    setFilterBy(filterBy);
    setFilterValue(filterValue);
  };

  const handleLoadMore = useCallback(() => {
    if (pagination && pagination.has_next && !loadingMore && !isSearchMode) {
      fetchLeads(pagination.current_page + 1, true);
    }
  }, [pagination, loadingMore, isSearchMode]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    if (isSearchMode) {
      searchLeads(searchQuery);
    } else {
      fetchLeads(1);
    }
  }, [isSearchMode, searchQuery]);

  const handleLeadPress = (lead: Lead) => {
    setSelectedLead({ ...lead });
    setViewMode('detail');
    setIsEditMode(false);
  };

  const handleIncentivePress = () => {
    if (selectedLead) {
      setViewMode('incentive');
    }
  };

  const handleBackToList = () => {
    setViewMode('list');
    setSelectedLead(null);
    setIsEditMode(false);
    setPendingLeadUpdate(null);
    // Refresh leads when going back to list
    fetchLeads(1);
  };

  const handleEditPress = () => {
    setIsEditMode(true);
  };

  const updateLead = async (leadData: Partial<Lead>, emails: string[], phones: string[]): Promise<boolean> => {
    try {
      if (!token || !selectedLead) return false;

      setLoading(true);

      const updatePayload: any = {
        token: token,
        lead_id: selectedLead.id
      };

      if (emails.length > 0) updatePayload.emails = emails;
      if (phones.length > 0) updatePayload.phone_numbers = phones;
      if (leadData.status !== undefined) updatePayload.status = leadData.status;
      if (leadData.phase !== undefined) updatePayload.phase = leadData.phase;
      if (leadData.subphase !== undefined) updatePayload.subphase = leadData.subphase;

      const response = await fetch(`${BACKEND_URL}/employee/updateLead`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatePayload)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      const updatedLead = {
        ...data.lead,
        createdAt: data.lead.created_at,
        collaborators: selectedLead.collaborators || [],
        comments: selectedLead.comments || []
      };

      setSelectedLead(updatedLead);

      // Update the lead in the list
      setLeads(prevLeads =>
        prevLeads.map(lead =>
          lead.id === selectedLead.id ? updatedLead : lead
        )
      );

      Alert.alert('Success', 'Lead updated successfully!');
      return true;
    } catch (error) {
      console.error('Error updating lead:', error);
      Alert.alert('Error', 'Failed to update lead. Please try again.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleSaveLead = async (updatedLead: Lead, editingEmails: string[], editingPhones: string[]) => {
    // Check if phase is "Post Property Finalization" and subphase is "Raise Invoice"
    if (updatedLead.phase === 'post_property_finalization' && updatedLead.subphase === 'raise_invoice') {
      // Store the pending update and show invoice form
      setPendingLeadUpdate({
        leadData: updatedLead,
        editingEmails: editingEmails,
        editingPhones: editingPhones
      });
      setShowInvoiceForm(true);
    } else {
      // For other phases/subphases, update directly
      const success = await updateLead(updatedLead, editingEmails, editingPhones);
      if (success) {
        setIsEditMode(false);
      }
    }
  };

  const handleInvoiceCreated = async () => {
    if (pendingLeadUpdate && selectedLead) {
      // Now update the lead after invoice is created
      const success = await updateLead(pendingLeadUpdate.leadData, pendingLeadUpdate.editingEmails, pendingLeadUpdate.editingPhones);
      if (success) {
        setIsEditMode(false);
        setPendingLeadUpdate(null);
        setShowInvoiceForm(false);
      }
    }
  };

  const handleInvoiceCancel = () => {
    setPendingLeadUpdate(null);
    setShowInvoiceForm(false);
  };

  const renderContent = () => {
    if (viewMode === 'incentive' && selectedLead) {
      return (
        <Incentive
          onBack={handleBackToList}
          leadId={selectedLead.id}
          leadName={selectedLead.name}
        />
      );
    }

    if (viewMode === 'detail' && selectedLead) {
      if (isEditMode) {
        return (
          <EditLead
            lead={selectedLead}
            onBack={handleBackToList}
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
          onBack={handleBackToList}
          onEdit={handleEditPress}
          onIncentivePress={handleIncentivePress}
          token={token}
          theme={theme}
        />
      );
    }

    return (
      <>
        <SearchAndFilter
          token={token}
          onSearch={handleSearch}
          onFilter={handleFilter}
          theme={theme}
          allPhases={allPhases}
          allSubphases={allSubphases}
          fetchSubphases={fetchSubphases}
          totalLeads={totalLeads} // Add this
          statusCounts={statusCounts} // Add this
        />
        <LeadsList
          leads={leads.filter(lead => {
            let matchesFilter = true;
            if (filterBy && filterValue) {
              if (filterBy === 'status') {
                matchesFilter = lead.status === filterValue;
              } else if (filterBy === 'phase') {
                matchesFilter = lead.phase === filterValue;
              } else if (filterBy === 'subphase') {
                matchesFilter = lead.subphase === filterValue;
              }
            }
            return matchesFilter;
          })}
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
      </>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top, backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "light-content"} backgroundColor={theme.headerBg} />

      <Header
        title={viewMode === 'list' ? 'BDT' : 'Lead Details'}
        onBack={viewMode === 'list' ? onBack : handleBackToList}
        onThemeToggle={toggleDarkMode}
        isDarkMode={isDarkMode}
        theme={theme}
        showThemeToggle={viewMode === 'list'}
        showEditButton={viewMode === 'detail' && !isEditMode}
        onEdit={handleEditPress}
        showSaveButton={viewMode === 'detail' && isEditMode}
        onSave={() => {/* Save is handled in EditLead component */ }}
        loading={loading}
      />

      {renderContent()}

      {selectedLead && (
        <CreateInvoice
          visible={showInvoiceForm}
          onClose={() => setShowInvoiceForm(false)}
          leadId={selectedLead.id}
          leadName={selectedLead.name}
          onInvoiceCreated={handleInvoiceCreated}
          onCancel={handleInvoiceCancel}
          theme={theme}
          token={token}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default BDT;