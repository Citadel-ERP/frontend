import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView,
  StatusBar, Alert, TextInput, FlatList, ActivityIndicator, RefreshControl, Dimensions
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BACKEND_URL } from '../../config/config';
import * as DocumentPicker from 'expo-document-picker';

import { colors, spacing, fontSize, borderRadius, shadows } from '../../styles/theme';
import { 
  BUPProps, Lead, Comment, CollaboratorData, DefaultComment, 
  FilterOption, Pagination, PotentialCollaborator
} from './BUP.types';
import { 
  DropdownModal, BackIcon, LeadCard, DetailView, 
  CreateLeadView, DefaultCommentsView 
} from './BUP.components';
import {
  beautifyName, createFilterOption, formatDate, 
  formatTime, formatDateTime, getStatusColor 
} from './BUP.utils';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const TOKEN_KEY = 'token_2';

const STATUS_CHOICES: FilterOption[] = [
  { value: 'active', label: 'Active' },
  { value: 'hold', label: 'Hold' },
  { value: 'mandate', label: 'Mandate' },
  { value: 'closed', label: 'Closed' },
  { value: 'no-requirement', label: 'No Requirement' },
  { value: 'transaction-complete', label: 'Transaction Complete' },
  { value: 'non-responsive', label: 'Non Responsive' }
];

const FILTER_OPTIONS: FilterOption[] = [
  { value: '', label: 'All Leads' },
  { value: 'status', label: 'Filter by Status' },
  { value: 'phase', label: 'Filter by Phase' },
  { value: 'subphase', label: 'Filter by Subphase' },
  { value: 'bdt', label: 'Filter by BDT' }
];

const BUP: React.FC<BUPProps> = ({ onBack }) => {
  const insets = useSafeAreaInsets();
  const [viewMode, setViewMode] = useState<'list' | 'detail' | 'create' | 'default-comments'>('list');
  const [token, setToken] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBy, setFilterBy] = useState('');
  const [filterValue, setFilterValue] = useState('');
  const [selectedPhase, setSelectedPhase] = useState('');
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [leads, setLeads] = useState<Lead[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [allPhases, setAllPhases] = useState<FilterOption[]>([]);
  const [allSubphases, setAllSubphases] = useState<FilterOption[]>([]);
  const [isSearchMode, setIsSearchMode] = useState(false);

  const [comments, setComments] = useState<Comment[]>([]);
  const [collaborators, setCollaborators] = useState<CollaboratorData[]>([]);
  const [commentsPagination, setCommentsPagination] = useState<Pagination | null>(null);
  const [loadingComments, setLoadingComments] = useState(false);
  const [loadingMoreComments, setLoadingMoreComments] = useState(false);
  const [loadingCollaborators, setLoadingCollaborators] = useState(false);

  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [newComment, setNewComment] = useState('');
  const [newCollaborator, setNewCollaborator] = useState('');
  const [showDefaultComments, setShowDefaultComments] = useState(false);

  const [defaultComments, setDefaultComments] = useState<DefaultComment[]>([]);
  const [loadingDefaultComments, setLoadingDefaultComments] = useState(false);
  const [selectedDocuments, setSelectedDocuments] = useState<DocumentPicker.DocumentPickerAsset[]>([]);
  const [addingComment, setAddingComment] = useState(false);

  const [potentialCollaborators, setPotentialCollaborators] = useState<PotentialCollaborator[]>([]);
  const [showPotentialCollaborators, setShowPotentialCollaborators] = useState(false);
  const [loadingPotentialCollaborators, setLoadingPotentialCollaborators] = useState(false);
  const [collaboratorSearchTimeout, setCollaboratorSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  const [newLeadName, setNewLeadName] = useState('');
  const [newLeadCompany, setNewLeadCompany] = useState('');
  const [newLeadEmails, setNewLeadEmails] = useState<string[]>([]);
  const [newLeadPhones, setNewLeadPhones] = useState<string[]>([]);
  const [newLeadStatus, setNewLeadStatus] = useState('active');
  const [newLeadPhase, setNewLeadPhase] = useState('');
  const [newLeadSubphase, setNewLeadSubphase] = useState('');
  const [newLeadAssignedTo, setNewLeadAssignedTo] = useState('');
  const [newEmailInput, setNewEmailInput] = useState('');
  const [newPhoneInput, setNewPhoneInput] = useState('');
  const [creatingLead, setCreatingLead] = useState(false);
  const [potentialBDTs, setPotentialBDTs] = useState<PotentialCollaborator[]>([]);
  const [showPotentialBDTs, setShowPotentialBDTs] = useState(false);
  const [bdtSearchTimeout, setBdtSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  const [editingEmails, setEditingEmails] = useState<string[]>([]);
  const [editingPhones, setEditingPhones] = useState<string[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');

  const [allDefaultComments, setAllDefaultComments] = useState<DefaultComment[]>([]);
  const [selectedDefaultCommentPhase, setSelectedDefaultCommentPhase] = useState('');
  const [selectedDefaultCommentSubphase, setSelectedDefaultCommentSubphase] = useState('');
  const [newDefaultCommentText, setNewDefaultCommentText] = useState('');
  const [addingDefaultComment, setAddingDefaultComment] = useState(false);

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
    }
  }, [token]);

  const fetchLeads = async (page: number = 1, append: boolean = false): Promise<void> => {
    try {
      if (!token) return;
      if (!append) setLoading(true);
      else setLoadingMore(true);

      const response = await fetch(`${BACKEND_URL}/citadel_admin/getAllLeads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token, page: page })
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

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
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();
      setAllPhases(data.phases.map(createFilterOption));
    } catch (error) {
      console.error('Error fetching phases:', error);
      setAllPhases([]);
    }
  };

  const fetchSubphases = async (phase: string): Promise<void> => {
    try {
      const response = await fetch(`${BACKEND_URL}/employee/getAllSubphases?phase=${encodeURIComponent(phase)}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();
      setAllSubphases(data.subphases.map(createFilterOption));
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

      const response = await fetch(`${BACKEND_URL}/citadel_admin/searchLeads?query=${encodeURIComponent(query)}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

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

  const handleLeadPress = (lead: Lead) => {
    setSelectedLead({ ...lead });
    setViewMode('detail');
    setIsEditMode(false);
    setComments([]);
    setCollaborators([]);
    setCommentsPagination(null);
    setSelectedDocuments([]);
    setNewComment('');
    setNewCollaborator('');
    setPotentialCollaborators([]);
    setShowPotentialCollaborators(false);
    setEditingEmails(lead.emails.map(e => e.email) || []);
    setEditingPhones(lead.phone_numbers.map(p => p.number) || []);
    fetchComments(lead.id, 1);
    fetchCollaborators(lead.id);
    fetchDefaultComments(lead.phase, lead.subphase);
  };

  const fetchComments = async (leadId: number, page: number = 1, append: boolean = false): Promise<void> => {
    try {
      if (!token) return;
      if (!append) setLoadingComments(true);
      else setLoadingMoreComments(true);

      const response = await fetch(`${BACKEND_URL}/citadel_admin/getComments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token, lead_id: leadId, page: page })
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();
      const transformedComments: Comment[] = data.comments.map((apiComment: any) => ({
        id: apiComment.comment.id.toString(),
        commentBy: apiComment.comment.user.full_name,
        date: apiComment.comment.created_at,
        phase: apiComment.created_at_phase,
        subphase: apiComment.created_at_subphase,
        content: apiComment.comment.content,
        hasFile: apiComment.comment.documents.length > 0,
        fileName: apiComment.comment.documents.length > 0 
          ? apiComment.comment.documents.map((doc: any) => doc.document_name).join(', ')
          : undefined,
        documents: apiComment.comment.documents
      }));

      if (append) {
        setComments(prevComments => [...prevComments, ...transformedComments]);
      } else {
        setComments(transformedComments);
      }
      setCommentsPagination(data.pagination);
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoadingComments(false);
      setLoadingMoreComments(false);
    }
  };

  const fetchCollaborators = async (leadId: number): Promise<void> => {
    try {
      if (!token) return;
      setLoadingCollaborators(true);

      const response = await fetch(`${BACKEND_URL}/citadel_admin/getCollaborators`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token, lead_id: leadId })
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();
      setCollaborators(data.collaborators);
    } catch (error) {
      console.error('Error fetching collaborators:', error);
    } finally {
      setLoadingCollaborators(false);
    }
  };

  const fetchDefaultComments = async (phase: string, subphase: string): Promise<void> => {
    try {
      if (!token) return;
      setLoadingDefaultComments(true);

      const response = await fetch(`${BACKEND_URL}/citadel_admin/getDefaultComments?at_phase=${encodeURIComponent(phase)}&at_subphase=${encodeURIComponent(subphase)}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();
      setDefaultComments(data.comments);
    } catch (error) {
      console.error('Error fetching default comments:', error);
      setDefaultComments([]);
    } finally {
      setLoadingDefaultComments(false);
    }
  };

  const filteredLeads = leads.filter(lead => {
    let matchesFilter = true;
    if (filterBy && filterValue) {
      if (filterBy === 'status') {
        matchesFilter = lead.status === filterValue;
      } else if (filterBy === 'phase') {
        matchesFilter = lead.phase === filterValue;
      } else if (filterBy === 'subphase') {
        matchesFilter = lead.subphase === filterValue;
      } else if (filterBy === 'bdt') {
        matchesFilter = lead.assigned_to.email === filterValue;
      }
    }
    return matchesFilter;
  });

  const getBDTList = (): FilterOption[] => {
    const bdtMap = new Map<string, string>();
    leads.forEach(lead => {
      if (lead.assigned_to) {
        bdtMap.set(lead.assigned_to.email, lead.assigned_to.full_name);
      }
    });
    return Array.from(bdtMap.entries()).map(([email, name]) => ({
      value: email,
      label: name
    }));
  };

  const handleLoadMore = useCallback(() => {
    if (pagination && pagination.has_next && !loadingMore && !isSearchMode) {
      fetchLeads(pagination.current_page + 1, true);
    }
  }, [pagination, loadingMore, isSearchMode]);

  const handleScroll = (event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 20) {
      handleLoadMore();
    }
  };

  const handleFetchAllDefaultComments = async () => {
    try {
      if (!token) return;
      setLoading(true);

      const allComments: DefaultComment[] = [];
      
      for (const phase of allPhases) {
        await fetchSubphases(phase.value);
        
        for (const subphase of allSubphases) {
          const response = await fetch(`${BACKEND_URL}/citadel_admin/getDefaultComments?at_phase=${encodeURIComponent(phase.value)}&at_subphase=${encodeURIComponent(subphase.value)}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
          });

          if (response.ok) {
            const data = await response.json();
            allComments.push(...data.comments);
          }
        }
      }

      setAllDefaultComments(allComments);
    } catch (error) {
      console.error('Error fetching all default comments:', error);
      Alert.alert('Error', 'Failed to fetch default comments.');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterSelection = (filterType: string) => {
    setFilterBy(filterType);
    if (!filterType) {
      setFilterValue('');
      setSelectedPhase('');
    } else {
      setTimeout(() => {
        if (filterType === 'status') {
          setActiveDropdown('status');
        } else if (filterType === 'phase') {
          setActiveDropdown('filter-phase');
        } else if (filterType === 'subphase') {
          if (allPhases.length > 0) {
            setActiveDropdown('filter-phase');
          }
        } else if (filterType === 'bdt') {
          setActiveDropdown('filter-bdt');
        }
      }, 300);
    }
  };

  const handlePhaseSelectionForFilter = (phase: string) => {
    setSelectedPhase(phase);
    if (filterBy === 'phase') {
      setFilterValue(phase);
    } else if (filterBy === 'subphase') {
      fetchSubphases(phase);
      setTimeout(() => {
        setActiveDropdown('filter-subphase');
      }, 300);
    }
  };

  const getFilterLabel = (filterKey: string, value: string): string => {
    let choices: FilterOption[] = [];
    switch (filterKey) {
      case 'status': choices = STATUS_CHOICES; break;
      case 'phase': choices = allPhases; break;
      case 'subphase': choices = allSubphases; break;
    }
    const option = choices.find(choice => choice.value === value);
    return option ? option.label : beautifyName(value);
  };

  if (viewMode === 'default-comments') {
    return (
      <DefaultCommentsView
        insets={insets}
        onBack={() => setViewMode('list')}
        allPhases={allPhases}
        allSubphases={allSubphases}
        allDefaultComments={allDefaultComments}
        setAllDefaultComments={setAllDefaultComments}
        selectedDefaultCommentPhase={selectedDefaultCommentPhase}
        setSelectedDefaultCommentPhase={setSelectedDefaultCommentPhase}
        selectedDefaultCommentSubphase={selectedDefaultCommentSubphase}
        setSelectedDefaultCommentSubphase={setSelectedDefaultCommentSubphase}
        newDefaultCommentText={newDefaultCommentText}
        setNewDefaultCommentText={setNewDefaultCommentText}
        addingDefaultComment={addingDefaultComment}
        loading={loading}
        activeDropdown={activeDropdown}
        setActiveDropdown={setActiveDropdown}
        token={token}
        fetchSubphases={fetchSubphases}
      />
    );
  }

  if (viewMode === 'create') {
    return (
      <CreateLeadView
        insets={insets}
        onBack={() => setViewMode('list')}
        allPhases={allPhases}
        allSubphases={allSubphases}
        newLeadName={newLeadName}
        setNewLeadName={setNewLeadName}
        newLeadCompany={newLeadCompany}
        setNewLeadCompany={setNewLeadCompany}
        newLeadEmails={newLeadEmails}
        setNewLeadEmails={setNewLeadEmails}
        newLeadPhones={newLeadPhones}
        setNewLeadPhones={setNewLeadPhones}
        newLeadStatus={newLeadStatus}
        setNewLeadStatus={setNewLeadStatus}
        newLeadPhase={newLeadPhase}
        setNewLeadPhase={setNewLeadPhase}
        newLeadSubphase={newLeadSubphase}
        setNewLeadSubphase={setNewLeadSubphase}
        newLeadAssignedTo={newLeadAssignedTo}
        setNewLeadAssignedTo={setNewLeadAssignedTo}
        newEmailInput={newEmailInput}
        setNewEmailInput={setNewEmailInput}
        newPhoneInput={newPhoneInput}
        setNewPhoneInput={setNewPhoneInput}
        potentialBDTs={potentialBDTs}
        setPotentialBDTs={setPotentialBDTs}
        creatingLead={creatingLead}
        activeDropdown={activeDropdown}
        setActiveDropdown={setActiveDropdown}
        token={token}
        fetchSubphases={fetchSubphases}
        fetchLeads={fetchLeads}
        setViewMode={(mode: string) => setViewMode(mode as 'list' | 'detail' | 'create' | 'default-comments')}
      />
    );
  }

  if (viewMode === 'detail' && selectedLead) {
    return (
      <DetailView
        insets={insets}
        selectedLead={selectedLead}
        setSelectedLead={setSelectedLead}
        isEditMode={isEditMode}
        setIsEditMode={setIsEditMode}
        onBack={() => setViewMode('list')}
        comments={comments}
        setComments={setComments}
        collaborators={collaborators}
        loadingComments={loadingComments}
        loadingCollaborators={loadingCollaborators}
        commentsPagination={commentsPagination}
        loadingMoreComments={loadingMoreComments}
        editingEmails={editingEmails}
        setEditingEmails={setEditingEmails}
        editingPhones={editingPhones}
        setEditingPhones={setEditingPhones}
        newEmail={newEmail}
        setNewEmail={setNewEmail}
        newPhone={newPhone}
        setNewPhone={setNewPhone}
        newComment={newComment}
        setNewComment={setNewComment}
        newCollaborator={newCollaborator}
        setNewCollaborator={setNewCollaborator}
        showDefaultComments={showDefaultComments}
        setShowDefaultComments={setShowDefaultComments}
        defaultComments={defaultComments}
        loadingDefaultComments={loadingDefaultComments}
        selectedDocuments={selectedDocuments}
        setSelectedDocuments={setSelectedDocuments}
        addingComment={addingComment}
        potentialCollaborators={potentialCollaborators}
        setPotentialCollaborators={setPotentialCollaborators}
        showPotentialCollaborators={showPotentialCollaborators}
        setShowPotentialCollaborators={setShowPotentialCollaborators}
        loadingPotentialCollaborators={loadingPotentialCollaborators}
        activeDropdown={activeDropdown}
        setActiveDropdown={setActiveDropdown}
        allPhases={allPhases}
        allSubphases={allSubphases}
        loading={loading}
        token={token}
        fetchSubphases={fetchSubphases}
        fetchComments={fetchComments}
        fetchCollaborators={fetchCollaborators}
      />
    );
  }

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <BackIcon />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>BUP Module</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.iconButton}
            onPress={() => {
              handleFetchAllDefaultComments();
              setViewMode('default-comments');
            }}
          >
            <Text style={styles.iconButtonText}>💬</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchFilterContainer}>
        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search leads... (Press Enter)"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={() => searchLeads(searchQuery)}
            returnKeyType="search"
            placeholderTextColor={colors.textSecondary}
          />
        </View>
        <TouchableOpacity 
          style={styles.filterButton} 
          onPress={() => setActiveDropdown('filter')}
        >
          <Text style={styles.filterIcon}>⚙️</Text>
          <Text style={styles.filterText}>Filter</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.createButton}
          onPress={() => setViewMode('create')}
        >
          <Text style={styles.createButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      {filterBy && filterValue && (
        <View style={styles.activeFilterContainer}>
          <Text style={styles.activeFilterText}>
            {filterBy === 'bdt' ? filterValue : getFilterLabel(filterBy, filterValue)}
          </Text>
          <TouchableOpacity onPress={() => { 
            setFilterBy(''); 
            setFilterValue(''); 
            setSelectedPhase('');
            if (!isSearchMode) fetchLeads(1);
          }}>
            <Text style={styles.clearFilterText}>Clear</Text>
          </TouchableOpacity>
        </View>
      )}

      {isSearchMode && (
        <View style={styles.searchModeIndicator}>
          <Text style={styles.searchModeText}>
            Search results for: "{searchQuery}"
          </Text>
          <TouchableOpacity onPress={() => {
            setSearchQuery('');
            setIsSearchMode(false);
            fetchLeads(1);
          }}>
            <Text style={styles.clearSearchText}>Clear Search</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView 
        style={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              isSearchMode ? searchLeads(searchQuery) : fetchLeads(1);
            }}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Leads ({filteredLeads.length}
            {pagination && !isSearchMode && ` of ${pagination.total_items}`})
            {isSearchMode && ' - Search Results'}
          </Text>

          {loading && leads.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Loading leads...</Text>
            </View>
          ) : filteredLeads.length > 0 ? (
            <>
              {filteredLeads.map((lead) => (
                <LeadCard key={lead.id} lead={lead} onPress={() => handleLeadPress(lead)} />
              ))}
              
              {loadingMore && (
                <View style={styles.loadMoreContainer}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={styles.loadMoreText}>Loading more leads...</Text>
                </View>
              )}

              {pagination && !pagination.has_next && !isSearchMode && leads.length > 0 && (
                <View style={styles.endOfListContainer}>
                  <Text style={styles.endOfListText}>
                    You've reached the end of the list
                  </Text>
                </View>
              )}
            </>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                {searchQuery || filterValue ? 'No leads match your criteria' : 'No leads found'}
              </Text>
              <Text style={styles.emptyStateSubtext}>
                {searchQuery || filterValue 
                  ? 'Try adjusting your search or filters' 
                  : 'Your leads will appear here when they are created'}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      <DropdownModal
        visible={activeDropdown === 'filter'}
        onClose={() => setActiveDropdown(null)}
        options={FILTER_OPTIONS}
        onSelect={handleFilterSelection}
        title="Filter Options"
      />

      <DropdownModal
        visible={activeDropdown === 'status'}
        onClose={() => setActiveDropdown(null)}
        options={STATUS_CHOICES}
        onSelect={(value) => setFilterValue(value)}
        title="Select Status"
      />
      
      <DropdownModal
        visible={activeDropdown === 'filter-phase'}
        onClose={() => setActiveDropdown(null)}
        options={allPhases}
        onSelect={handlePhaseSelectionForFilter}
        title={filterBy === 'subphase' ? "Select Phase (for Subphase)" : "Select Phase"}
      />
      
      <DropdownModal
        visible={activeDropdown === 'filter-subphase'}
        onClose={() => setActiveDropdown(null)}
        options={allSubphases}
        onSelect={(value) => { setFilterValue(value); setActiveDropdown(null); }}
        title="Select Subphase"
      />

      <DropdownModal
        visible={activeDropdown === 'filter-bdt'}
        onClose={() => setActiveDropdown(null)}
        options={getBDTList()}
        onSelect={(value) => setFilterValue(value)}
        title="Select BDT"
        searchable={true}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.primary },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md, backgroundColor: colors.primary,
  },
  backButton: { padding: spacing.sm },
  headerTitle: {
    fontSize: fontSize.xl, fontWeight: '600', color: colors.white, flex: 1, marginLeft: spacing.md,
  },
  headerActions: { flexDirection: 'row', gap: spacing.sm },
  iconButton: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  iconButtonText: { fontSize: fontSize.lg },
  searchFilterContainer: {
    flexDirection: 'row', paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    backgroundColor: colors.primary, gap: spacing.sm,
  },
  searchContainer: {
    flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white,
    borderRadius: borderRadius.lg, paddingHorizontal: spacing.md, height: 44,
  },
  searchIcon: { fontSize: fontSize.md, marginRight: spacing.sm },
  searchInput: { flex: 1, fontSize: fontSize.md, color: colors.text },
  filterButton: {
    width: 70, height: 44, borderRadius: borderRadius.lg, backgroundColor: colors.white,
    alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: spacing.xs,
  },
  filterIcon: { fontSize: fontSize.md },
  filterText: { fontSize: fontSize.xs, color: colors.text, fontWeight: '500' },
  createButton: {
    width: 44, height: 44, borderRadius: borderRadius.lg, backgroundColor: colors.success,
    alignItems: 'center', justifyContent: 'center',
  },
  createButtonText: { fontSize: 24, color: colors.white, fontWeight: '300' },
  activeFilterContainer: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, backgroundColor: colors.info + '20',
  },
  activeFilterText: { fontSize: fontSize.sm, color: colors.info, fontWeight: '600' },
  clearFilterText: { fontSize: fontSize.sm, color: colors.error, fontWeight: '600' },
  searchModeIndicator: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, backgroundColor: colors.success + '20',
  },
  searchModeText: { color: colors.success, fontWeight: '500', flex: 1 },
  clearSearchText: { color: colors.error, fontWeight: '500' },
  contentContainer: { flex: 1, backgroundColor: colors.backgroundSecondary, paddingHorizontal: spacing.lg },
  section: { marginTop: spacing.lg, marginBottom: spacing.xl },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: '600', color: colors.text, marginBottom: spacing.md },
  loadingContainer: { alignItems: 'center', paddingVertical: spacing.xxl },
  loadingText: { marginTop: spacing.md, color: colors.textSecondary, fontSize: fontSize.sm },
  loadMoreContainer: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.lg,
  },
  loadMoreText: { marginLeft: spacing.sm, color: colors.textSecondary },
  endOfListContainer: { alignItems: 'center', paddingVertical: spacing.lg },
  endOfListText: { color: colors.textSecondary, fontStyle: 'italic' },
  emptyState: {
    backgroundColor: colors.white, borderRadius: borderRadius.lg, padding: spacing.xl,
    alignItems: 'center', ...shadows.md,
  },
  emptyStateText: {
    fontSize: fontSize.md, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.xs,
  },
  emptyStateSubtext: {
    fontSize: fontSize.sm, color: colors.textSecondary, textAlign: 'center', fontStyle: 'italic',
  },
});

export default BUP;