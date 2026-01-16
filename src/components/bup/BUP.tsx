import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  StatusBar,
  Alert,
  BackHandler,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BACKEND_URL } from '../../config/config';
import { BUPProps, Lead, ViewMode, ThemeColors, Pagination, FilterOption } from './types';
import { lightTheme, darkTheme } from './theme';
import Header from './header';
import Cities from './cities';
import LeadsList from './list';
import SearchAndFilter from './searchAndFilter';
import LeadDetails from './leadDetails';
import EditLead from './editDetails';
import CreateLead from './createLead';

const TOKEN_KEY = 'token_2';

const BUP: React.FC<BUPProps> = ({ onBack }) => {
  const insets = useSafeAreaInsets();
  const [viewMode, setViewMode] = useState<ViewMode>('city-selection');
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [token, setToken] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // State for list view
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
  const [allAssignedTo, setAllAssignedTo] = useState<FilterOption[]>([]);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});

  // State for detail view
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isEditMode, setIsEditMode] = useState(false); // ADDED THIS LINE

  // Calculate totalLeads from statusCounts
  const totalLeads = useMemo(() => {
    if (!statusCounts || Object.keys(statusCounts).length === 0) {
      return 0;
    }
    return Object.values(statusCounts).reduce(
      (sum, count) => sum + (Number(count) || 0),
      0
    );
  }, [statusCounts]);

  const theme: ThemeColors = isDarkMode ? darkTheme : lightTheme;

  // Filtered leads
  const filteredLeads = leads.filter(lead => {
    let matchesFilter = true;
    if (filterBy && filterValue) {
      if (filterBy === 'status') {
        matchesFilter = lead.status === filterValue;
      } else if (filterBy === 'phase') {
        matchesFilter = lead.phase === filterValue;
      } else if (filterBy === 'subphase') {
        matchesFilter = lead.subphase === filterValue;
      } else if (filterBy === 'assigned_to') {
        matchesFilter = lead.assigned_to?.employee_id === filterValue;
      }
    }
    return matchesFilter;
  });

  // Handle Android hardware back button
  useEffect(() => {
    const handleBackPress = () => {
      if (viewMode === 'list') {
        handleBackToCitySelection();
        return true;
      } else if (viewMode === 'detail') {
        if (isEditMode) {
          setIsEditMode(false);
        } else {
          handleBackToList();
        }
        return true;
      } else if (viewMode === 'create') {
        handleBackToList();
        return true;
      } else if (viewMode === 'city-selection') {
        if (onBack) {
          onBack();
          return true;
        }
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      handleBackPress
    );

    return () => backHandler.remove();
  }, [viewMode, isEditMode, onBack]);

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
    if (token && selectedCity && viewMode === 'list') {
      fetchLeads(1);
      fetchPhases();
       fetchAssignedToOptions();
      fetchStatusCounts();
    }
  }, [token, selectedCity, viewMode]);

  // Fetch status counts
  const fetchStatusCounts = async (): Promise<void> => {
    try {
      if (!token || !selectedCity) return;
      const response = await fetch(`${BACKEND_URL}/manager/getLeadStatusCounts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          city: selectedCity
        })
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

  const toggleDarkMode = async () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    await AsyncStorage.setItem('dark_mode', newDarkMode.toString());
  };

  const fetchLeads = async (page: number = 1, append: boolean = false): Promise<void> => {
    try {
      if (!token || !selectedCity) return;
      if (!append) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const requestBody: any = {
        token: token,
        city: selectedCity,
        page: page
      };

      if (filterBy && filterValue) {
        requestBody.filters = {
          [filterBy]: filterValue
        };
      }

      const response = await fetch(`${BACKEND_URL}/manager/getLeads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
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
      const response = await fetch(`${BACKEND_URL}/manager/getAllSubphases?phase=${encodeURIComponent(phase)}`, {
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


  const fetchAssignedToOptions = async (): Promise<void> => {
    try {
      if (!token) return;

      const response = await fetch(`${BACKEND_URL}/manager/getUsers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Transform users data into FilterOption format
      const options = data.users.map((user: any) => ({
        value: user.employee_id,
        label: `${user.first_name} ${user.last_name}`
      }));

      setAllAssignedTo(options);
    } catch (error) {
      console.error('Error fetching assigned to options:', error);
      setAllAssignedTo([]);
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

      const response = await fetch(`${BACKEND_URL}/manager/searchLead?query=${encodeURIComponent(query)}`, {
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
      fetchStatusCounts();
    }
  }, [isSearchMode, searchQuery]);

  const handleCitySelection = (city: string) => {
    setSelectedCity(city);
    setViewMode('list');
  };

  const handleLeadPress = (lead: Lead) => {
    setSelectedLead({ ...lead });
    setViewMode('detail');
    setIsEditMode(false);
  };

  const handleBackToList = useCallback(() => {
    setViewMode('list');
    setSelectedLead(null);
    setIsEditMode(false);
    fetchLeads(1);
    fetchStatusCounts();
  }, []);

  const handleBackToCitySelection = useCallback(() => {
    setViewMode('city-selection');
    setSelectedCity('');
    setLeads([]);
    setSearchQuery('');
    setFilterBy('');
    setFilterValue('');
    setIsSearchMode(false);
    setStatusCounts({});
  }, []);

  const handleEditPress = () => {
    setIsEditMode(true);
  };

  const handleCreateLead = () => {
    setViewMode('create');
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
      if (leadData.name !== undefined) updatePayload.name = leadData.name;
      if (leadData.company !== undefined) updatePayload.company = leadData.company;
      if (leadData.status !== undefined) updatePayload.status = leadData.status;
      if (leadData.phase !== undefined) updatePayload.phase = leadData.phase;
      if (leadData.subphase !== undefined) updatePayload.subphase = leadData.subphase;
      if (leadData.city !== undefined) updatePayload.city = leadData.city;

      const response = await fetch(`${BACKEND_URL}/manager/updateLead`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatePayload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const updatedLead = {
        ...data.lead,
        createdAt: data.lead.created_at,
        collaborators: [],
        comments: []
      };

      setSelectedLead(updatedLead);
      setLeads(prevLeads =>
        prevLeads.map(lead =>
          lead.id === selectedLead.id ? updatedLead : lead
        )
      );

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

  const handleSaveLead = async (updatedLead: Lead, editingEmails: string[], editingPhones: string[]) => {
    const success = await updateLead(updatedLead, editingEmails, editingPhones);
    if (success) {
      setIsEditMode(false);
      fetchStatusCounts();
    }
  };

  const getHeaderTitle = () => {
    if (viewMode === 'city-selection') return 'Select City';
    if (viewMode === 'create') return 'Create New Lead';
    if (viewMode === 'detail') return 'Lead Details';
    return `${selectedCity} - BUP`;
  };

  const renderContent = () => {
    switch (viewMode) {
      case 'city-selection':
        return (
          <Cities
            onCitySelect={handleCitySelection}
            onBack={onBack}
            theme={theme}
          />
        );
      case 'create':
        return (
          <CreateLead
            onBack={handleBackToList}
            onCreate={() => {
              fetchLeads(1);
              fetchStatusCounts();
              setViewMode('list');
            }}
            selectedCity={selectedCity}
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
          />
        );
      case 'list':
      default:
        return (
          <>
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
              onBack={handleBackToCitySelection}
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
              pagination={pagination}
              isSearchMode={isSearchMode}
              searchQuery={searchQuery}
              token={token}
              theme={theme}
              isDarkMode={isDarkMode}
            />
          </>
        );
    }
  };

  const getHeaderActions = () => {
    if (viewMode === 'city-selection') {
      return {
        showBackButton: true,
        onBack: onBack,
        showThemeToggle: true
      };
    }
    if (viewMode === 'list') {
      return {
        showBackButton: true,
        onBack: handleBackToCitySelection,
        showAddButton: true,
        onAddPress: handleCreateLead,
        addButtonText: '+ Lead',
        showThemeToggle: true,
      };
    }
    if (viewMode === 'detail') {
      if (isEditMode) {
        return {
          showBackButton: true,
          onBack: () => setIsEditMode(false),
          showSaveButton: true,
          onSavePress: () => { }, // Save is handled in EditLead component
          showThemeToggle: true,
        };
      }
      return {
        showBackButton: true,
        onBack: handleBackToList,
        showEditButton: true,
        onEdit: handleEditPress,
        showThemeToggle: true,
      };
    }
    if (viewMode === 'create') {
      return {
        showBackButton: true,
        onBack: handleBackToList,
        showSaveButton: true,
        onSavePress: () => { }, // Save is handled in CreateLead component
        showThemeToggle: true,
      };
    }
    return {
      showBackButton: true,
      onBack: onBack,
      showThemeToggle: true,
    };
  };

  const headerActions = getHeaderActions();

  return (
    <View style={[styles.container, { backgroundColor: 'transparent' }]}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />

      {viewMode !== 'city-selection' && viewMode !== 'detail' && (
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
  container: {
    flex: 1,
    paddingTop: 0
  },
});

export default BUP;