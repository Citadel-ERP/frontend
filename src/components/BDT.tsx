import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView,
  StatusBar, Alert, Modal, ActivityIndicator, TextInput, Platform,
  Dimensions, KeyboardAvoidingView, FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, borderRadius, shadows } from '../styles/theme';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface BDTProps { 
  onBack: () => void; 
}

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  status: string;
  phase: string;
  subphase: string;
  collaborator: string;
  comments: Comment[];
  createdAt: string;
}

interface Comment {
  id: string;
  commentBy: string;
  date: string;
  phase: string;
  subphase: string;
  content: string;
  hasFile?: boolean;
  fileName?: string;
}

interface FilterState {
  phase: string;
  subphase: string;
  status: string;
}

type ViewMode = 'list' | 'detail';

const STATUS_CHOICES = [
  { value: 'active', label: 'Active' },
  { value: 'hold', label: 'Hold' },
  { value: 'no_requirement', label: 'No-Requirement' },
  { value: 'mandate', label: 'Mandate' },
  { value: 'closed', label: 'Closed' },
  { value: 'transaction_complete', label: 'Transaction-Complete' },
  { value: 'non_responsive', label: 'Non-Responsive' },
];

const PHASE_CHOICES = [
  { value: 'lead_generation', label: 'Lead Generation' },
  { value: 'qualification', label: 'Qualification' },
  { value: 'proposal', label: 'Proposal' },
  { value: 'negotiation', label: 'Negotiation' },
  { value: 'closing', label: 'Closing' },
];

const SUBPHASE_CHOICES = [
  { value: 'initial_contact', label: 'Initial Contact' },
  { value: 'follow_up', label: 'Follow Up' },
  { value: 'presentation', label: 'Presentation' },
  { value: 'demo', label: 'Demo' },
  { value: 'pricing', label: 'Pricing' },
  { value: 'contract', label: 'Contract' },
];

const DEFAULT_COMMENTS = [
  { value: 'follow_up_call', label: 'Follow up call scheduled' },
  { value: 'proposal_sent', label: 'Proposal sent to client' },
  { value: 'meeting_scheduled', label: 'Meeting scheduled' },
  { value: 'demo_completed', label: 'Demo completed successfully' },
  { value: 'awaiting_response', label: 'Awaiting client response' },
];

// Hardcoded sample data
const SAMPLE_LEADS: Lead[] = [
  {
    id: '1',
    name: 'John Doe',
    email: 'john.doe@example.com',
    phone: '+91 9876543210',
    company: 'Tech Solutions Inc',
    status: 'active',
    phase: 'qualification',
    subphase: 'follow_up',
    collaborator: 'Alice Smith',
    createdAt: '2024-01-15T10:30:00Z',
    comments: [
      {
        id: '1',
        commentBy: 'Alice Smith',
        date: '2024-01-15T14:30:00Z',
        phase: 'lead_generation',
        subphase: 'initial_contact',
        content: 'Initial contact made via phone call. Client showed interest in our CRM solution.',
        hasFile: true,
        fileName: 'initial_discussion.pdf'
      },
      {
        id: '2',
        commentBy: 'Bob Johnson',
        date: '2024-01-16T09:15:00Z',
        phase: 'qualification',
        subphase: 'follow_up',
        content: 'Follow-up meeting scheduled for next week. Client wants to see demo.',
      }
    ]
  },
  {
    id: '2',
    name: 'Sarah Wilson',
    email: 'sarah.wilson@corp.com',
    phone: '+91 8765432109',
    company: 'Corporate Systems',
    status: 'hold',
    phase: 'proposal',
    subphase: 'pricing',
    collaborator: 'Mike Davis',
    createdAt: '2024-01-10T08:45:00Z',
    comments: [
      {
        id: '3',
        commentBy: 'Mike Davis',
        date: '2024-01-10T16:20:00Z',
        phase: 'proposal',
        subphase: 'pricing',
        content: 'Sent detailed pricing proposal. Client is evaluating multiple vendors.',
        hasFile: true,
        fileName: 'pricing_proposal.xlsx'
      }
    ]
  },
  {
    id: '3',
    name: 'David Brown',
    email: 'david.brown@startup.io',
    phone: '+91 7654321098',
    company: 'Innovation Startup',
    status: 'mandate',
    phase: 'negotiation',
    subphase: 'contract',
    collaborator: 'Lisa Chen',
    createdAt: '2024-01-12T11:20:00Z',
    comments: [
      {
        id: '4',
        commentBy: 'Lisa Chen',
        date: '2024-01-12T13:45:00Z',
        phase: 'negotiation',
        subphase: 'contract',
        content: 'Contract terms under review. Minor adjustments requested by legal team.',
      }
    ]
  }
];

// Filter Modal Component
interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  onApplyFilters: () => void;
  onClearFilters: () => void;
}

const FilterModal: React.FC<FilterModalProps> = ({
  visible,
  onClose,
  filters,
  onFiltersChange,
  onApplyFilters,
  onClearFilters
}) => {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.filterOverlay}>
        <TouchableOpacity style={styles.filterOverlayTouchable} activeOpacity={1} onPress={onClose} />
        <View style={styles.filterContainer}>
          <View style={styles.filterHeader}>
            <Text style={styles.filterTitle}>Filter Leads</Text>
            <TouchableOpacity onPress={onClose} style={styles.filterCloseButton}>
              <Text style={styles.filterCloseText}>×</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.filterContent} showsVerticalScrollIndicator={false}>
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Phase</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterOptions}>
                {PHASE_CHOICES.map((phase) => (
                  <TouchableOpacity
                    key={phase.value}
                    style={[
                      styles.filterOption,
                      filters.phase === phase.value && styles.filterOptionSelected
                    ]}
                    onPress={() => onFiltersChange({ 
                      ...filters, 
                      phase: filters.phase === phase.value ? '' : phase.value 
                    })}
                  >
                    <Text style={[
                      styles.filterOptionText,
                      filters.phase === phase.value && styles.filterOptionTextSelected
                    ]}>
                      {phase.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Subphase</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterOptions}>
                {SUBPHASE_CHOICES.map((subphase) => (
                  <TouchableOpacity
                    key={subphase.value}
                    style={[
                      styles.filterOption,
                      filters.subphase === subphase.value && styles.filterOptionSelected
                    ]}
                    onPress={() => onFiltersChange({ 
                      ...filters, 
                      subphase: filters.subphase === subphase.value ? '' : subphase.value 
                    })}
                  >
                    <Text style={[
                      styles.filterOptionText,
                      filters.subphase === subphase.value && styles.filterOptionTextSelected
                    ]}>
                      {subphase.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Status</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterOptions}>
                {STATUS_CHOICES.map((status) => (
                  <TouchableOpacity
                    key={status.value}
                    style={[
                      styles.filterOption,
                      filters.status === status.value && styles.filterOptionSelected
                    ]}
                    onPress={() => onFiltersChange({ 
                      ...filters, 
                      status: filters.status === status.value ? '' : status.value 
                    })}
                  >
                    <Text style={[
                      styles.filterOptionText,
                      filters.status === status.value && styles.filterOptionTextSelected
                    ]}>
                      {status.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </ScrollView>

          <View style={styles.filterButtons}>
            <TouchableOpacity style={styles.filterClearButton} onPress={onClearFilters}>
              <Text style={styles.filterClearText}>Clear All</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.filterApplyButton} onPress={onApplyFilters}>
              <Text style={styles.filterApplyText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// Dropdown Component
interface DropdownProps {
  value: string;
  options: Array<{ value: string; label: string }>;
  onSelect: (value: string) => void;
  placeholder?: string;
}

const Dropdown: React.FC<DropdownProps> = ({ value, options, onSelect, placeholder = "Select..." }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const selectedOption = options.find(opt => opt.value === value);

  return (
    <View style={styles.dropdownContainer}>
      <TouchableOpacity
        style={styles.dropdownButton}
        onPress={() => setIsOpen(true)}
      >
        <Text style={[
          styles.dropdownButtonText,
          !selectedOption && styles.dropdownPlaceholder
        ]}>
          {selectedOption ? selectedOption.label : placeholder}
        </Text>
        <Text style={styles.dropdownArrow}>▼</Text>
      </TouchableOpacity>

      <Modal visible={isOpen} transparent animationType="fade" onRequestClose={() => setIsOpen(false)}>
        <TouchableOpacity style={styles.dropdownOverlay} activeOpacity={1} onPress={() => setIsOpen(false)}>
          <View style={styles.dropdownModal}>
            <ScrollView style={styles.dropdownList} showsVerticalScrollIndicator={false}>
              {options.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.dropdownItem,
                    value === option.value && styles.dropdownItemSelected
                  ]}
                  onPress={() => {
                    onSelect(option.value);
                    setIsOpen(false);
                  }}
                >
                  <Text style={[
                    styles.dropdownItemText,
                    value === option.value && styles.dropdownItemTextSelected
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

// Detail Screen Component
interface DetailScreenProps {
  lead: Lead;
  onBack: () => void;
  onUpdateLead: (updatedLead: Lead) => void;
}

const DetailScreen: React.FC<DetailScreenProps> = ({ lead, onBack, onUpdateLead }) => {
  const insets = useSafeAreaInsets();
  const [editableLead, setEditableLead] = useState<Lead>(lead);
  const [newComment, setNewComment] = useState('');
  const [showDefaultComments, setShowDefaultComments] = useState(false);

  const BackIcon = () => (
    <View style={styles.backIcon}>
      <View style={styles.backArrow} />
    </View>
  );

  const formatDateTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'active': return colors.success;
      case 'hold': return colors.warning;
      case 'mandate': return colors.info;
      case 'closed': return colors.error;
      case 'transaction_complete': return colors.primary;
      default: return colors.textSecondary;
    }
  };

  const handleAddComment = () => {
    if (!newComment.trim()) {
      Alert.alert('Error', 'Please enter a comment');
      return;
    }

    const comment: Comment = {
      id: Date.now().toString(),
      commentBy: 'Current User',
      date: new Date().toISOString(),
      phase: editableLead.phase,
      subphase: editableLead.subphase,
      content: newComment.trim()
    };

    const updatedLead = {
      ...editableLead,
      comments: [...editableLead.comments, comment]
    };

    setEditableLead(updatedLead);
    onUpdateLead(updatedLead);
    setNewComment('');
  };

  const handleDefaultCommentSelect = (comment: string) => {
    setNewComment(comment);
    setShowDefaultComments(false);
  };

  const handleSave = () => {
    onUpdateLead(editableLead);
    Alert.alert('Success', 'Lead updated successfully');
  };

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <BackIcon />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Lead Details</Text>
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.detailContent} showsVerticalScrollIndicator={false}>
        {/* Section 1: Lead Information */}
        <View style={styles.detailSection}>
          <Text style={styles.sectionTitle}>Lead Information</Text>
          
          <View style={styles.formRow}>
            <Text style={styles.fieldLabel}>Name</Text>
            <View style={styles.nonEditableField}>
              <Text style={styles.nonEditableText}>{editableLead.name}</Text>
            </View>
          </View>

          <View style={styles.formRow}>
            <Text style={styles.fieldLabel}>Email</Text>
            <TextInput
              style={styles.editableField}
              value={editableLead.email}
              onChangeText={(text) => setEditableLead({...editableLead, email: text})}
              keyboardType="email-address"
            />
          </View>

          <View style={styles.formRow}>
            <Text style={styles.fieldLabel}>Phone Number</Text>
            <TextInput
              style={styles.editableField}
              value={editableLead.phone}
              onChangeText={(text) => setEditableLead({...editableLead, phone: text})}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.formRow}>
            <Text style={styles.fieldLabel}>Company</Text>
            <TextInput
              style={styles.editableField}
              value={editableLead.company}
              onChangeText={(text) => setEditableLead({...editableLead, company: text})}
            />
          </View>

          <View style={styles.formRow}>
            <Text style={styles.fieldLabel}>Status</Text>
            <Dropdown
              value={editableLead.status}
              options={STATUS_CHOICES}
              onSelect={(value) => setEditableLead({...editableLead, status: value})}
              placeholder="Select Status"
            />
          </View>

          <View style={styles.formRow}>
            <Text style={styles.fieldLabel}>Phase</Text>
            <Dropdown
              value={editableLead.phase}
              options={PHASE_CHOICES}
              onSelect={(value) => setEditableLead({...editableLead, phase: value})}
              placeholder="Select Phase"
            />
          </View>

          <View style={styles.formRow}>
            <Text style={styles.fieldLabel}>Subphase</Text>
            <Dropdown
              value={editableLead.subphase}
              options={SUBPHASE_CHOICES}
              onSelect={(value) => setEditableLead({...editableLead, subphase: value})}
              placeholder="Select Subphase"
            />
          </View>

          <View style={styles.formRow}>
            <Text style={styles.fieldLabel}>Collaborator</Text>
            <TextInput
              style={styles.editableField}
              value={editableLead.collaborator}
              onChangeText={(text) => setEditableLead({...editableLead, collaborator: text})}
              placeholder="Add collaborator email/username and press confirm"
            />
          </View>
        </View>

        {/* Section 2: Comments */}
        <View style={styles.detailSection}>
          <Text style={styles.sectionTitle}>Comments</Text>
          
          {editableLead.comments.map((comment) => (
            <View key={comment.id} style={styles.commentItem}>
              <View style={styles.commentHeader}>
                <View style={styles.commentMetaRow}>
                  <Text style={styles.commentBy}>Comment by: {comment.commentBy}</Text>
                  <Text style={styles.commentTime}>Time: {formatDateTime(comment.date)}</Text>
                </View>
                <View style={styles.commentMetaRow}>
                  <Text style={styles.commentPhase}>Phase: {comment.phase}</Text>
                  <Text style={styles.commentSubphase}>Subphase: {comment.subphase}</Text>
                </View>
              </View>
              <Text style={styles.commentContent}>Content: {comment.content}</Text>
              {comment.hasFile && (
                <TouchableOpacity style={styles.fileDownload}>
                  <Text style={styles.fileDownloadText}>📎 Download: {comment.fileName}</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}

          {editableLead.comments.length === 0 && (
            <Text style={styles.noCommentsText}>No comments yet</Text>
          )}
        </View>

        {/* Section 3: Add Comment */}
        <View style={styles.detailSection}>
          <View style={styles.commentActions}>
            <TouchableOpacity
              style={styles.defaultCommentsButton}
              onPress={() => setShowDefaultComments(true)}
            >
              <Text style={styles.defaultCommentsText}>Default Comments ▼</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.attachDocButton}>
              <Text style={styles.attachDocText}>📎 Attach Document</Text>
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.commentInput}
            value={newComment}
            onChangeText={setNewComment}
            placeholder="Add a comment..."
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          <TouchableOpacity style={styles.addCommentButton} onPress={handleAddComment}>
            <Text style={styles.addCommentText}>Add Comment</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Default Comments Modal */}
      <Modal visible={showDefaultComments} transparent animationType="fade" onRequestClose={() => setShowDefaultComments(false)}>
        <TouchableOpacity style={styles.defaultCommentsOverlay} activeOpacity={1} onPress={() => setShowDefaultComments(false)}>
          <View style={styles.defaultCommentsModal}>
            <Text style={styles.defaultCommentsTitle}>Select Default Comment</Text>
            <ScrollView style={styles.defaultCommentsList}>
              {DEFAULT_COMMENTS.map((comment) => (
                <TouchableOpacity
                  key={comment.value}
                  style={styles.defaultCommentItem}
                  onPress={() => handleDefaultCommentSelect(comment.label)}
                >
                  <Text style={styles.defaultCommentItemText}>{comment.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const BDT: React.FC<BDTProps> = ({ onBack }) => {
  const insets = useSafeAreaInsets();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [leads, setLeads] = useState<Lead[]>(SAMPLE_LEADS);
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>(SAMPLE_LEADS);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterState>({ phase: '', subphase: '', status: '' });

  useEffect(() => {
    applyFilters();
  }, [searchQuery, leads]);

  const applyFilters = () => {
    let filtered = leads;

    // Apply search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(lead =>
        lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply other filters
    if (filters.phase) {
      filtered = filtered.filter(lead => lead.phase === filters.phase);
    }
    if (filters.subphase) {
      filtered = filtered.filter(lead => lead.subphase === filters.subphase);
    }
    if (filters.status) {
      filtered = filtered.filter(lead => lead.status === filters.status);
    }

    setFilteredLeads(filtered);
  };

  const handleApplyFilters = () => {
    applyFilters();
    setShowFilters(false);
  };

  const handleClearFilters = () => {
    setFilters({ phase: '', subphase: '', status: '' });
    setSearchQuery('');
  };

  const handleLeadPress = (lead: Lead) => {
    setSelectedLead(lead);
    setViewMode('detail');
  };

  const handleBackFromDetail = () => {
    setViewMode('list');
    setSelectedLead(null);
  };

  const handleUpdateLead = (updatedLead: Lead) => {
    const updatedLeads = leads.map(lead => 
      lead.id === updatedLead.id ? updatedLead : lead
    );
    setLeads(updatedLeads);
    setSelectedLead(updatedLead);
  };

  const formatDateTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
    });
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'active': return colors.success;
      case 'hold': return colors.warning;
      case 'mandate': return colors.info;
      case 'closed': return colors.error;
      case 'transaction_complete': return colors.primary;
      default: return colors.textSecondary;
    }
  };

  const BackIcon = () => (
    <View style={styles.backIcon}>
      <View style={styles.backArrow} />
    </View>
  );

  // If viewing lead details, show detail screen
  if (viewMode === 'detail' && selectedLead) {
    return (
      <DetailScreen
        lead={selectedLead}
        onBack={handleBackFromDetail}
        onUpdateLead={handleUpdateLead}
      />
    );
  }

  // Main list screen
  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <BackIcon />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>BDT Module</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search leads..."
            placeholderTextColor={colors.textSecondary}
          />
          <TouchableOpacity style={styles.filterButton} onPress={() => setShowFilters(true)}>
            <Text style={styles.filterButtonText}>🔍 Filter</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.leadsContainer}>
          <Text style={styles.sectionTitle}>Leads ({filteredLeads.length})</Text>
          
          {filteredLeads.map((lead) => (
            <TouchableOpacity
              key={lead.id}
              style={styles.leadCard}
              onPress={() => handleLeadPress(lead)}
            >
              <View style={styles.leadHeader}>
                <View style={styles.leadMeta}>
                  <Text style={styles.leadMetaText}>Comment by: {lead.collaborator}</Text>
                  <Text style={styles.leadMetaText}>Phase: {PHASE_CHOICES.find(p => p.value === lead.phase)?.label}</Text>
                </View>
                <View style={styles.leadMeta}>
                  <Text style={styles.leadMetaText}>Subphase: {SUBPHASE_CHOICES.find(s => s.value === lead.subphase)?.label}</Text>
                  <Text style={styles.leadMetaText}>Time: {formatDateTime(lead.createdAt)}</Text>
                </View>
              </View>
              
              <View style={styles.leadContent}>
                <Text style={styles.leadContentLabel}>Content:</Text>
                <Text style={styles.leadContentText}>
                  {lead.name} from {lead.company} - {STATUS_CHOICES.find(s => s.value === lead.status)?.label}
                </Text>
              </View>

              {lead.comments.some(c => c.hasFile) && (
                <View style={styles.leadFile}>
                  <Text style={styles.leadFileText}>File attached: 📎 Download</Text>
                </View>
              )}

              <View style={styles.leadFooter}>
                <View style={[styles.leadStatusBadge, { backgroundColor: getStatusColor(lead.status) }]}>
                  <Text style={styles.leadStatusText}>
                    {STATUS_CHOICES.find(s => s.value === lead.status)?.label}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}

          {filteredLeads.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No leads found</Text>
              <Text style={styles.emptyStateSubtext}>
                {searchQuery || filters.phase || filters.subphase || filters.status
                  ? 'Try adjusting your search or filters'
                  : 'No leads available at the moment'
                }
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      <FilterModal
        visible={showFilters}
        onClose={() => setShowFilters(false)}
        filters={filters}
        onFiltersChange={setFilters}
        onApplyFilters={handleApplyFilters}
        onClearFilters={handleClearFilters}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: colors.primary 
  },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: spacing.lg, 
    paddingVertical: spacing.md, 
    backgroundColor: colors.primary 
  },
  backButton: { 
    padding: spacing.sm, 
    borderRadius: borderRadius.sm 
  },
  backIcon: { 
    width: 24, 
    height: 24, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  backArrow: { 
    width: 12, 
    height: 12, 
    borderLeftWidth: 2, 
    borderTopWidth: 2, 
    borderColor: colors.white, 
    transform: [{ rotate: '-45deg' }] 
  },
  headerTitle: { 
    fontSize: fontSize.xl, 
    fontWeight: '600', 
    color: colors.white, 
    flex: 1, 
    textAlign: 'center' 
  },
  headerSpacer: { 
    width: 40 
  },
  saveButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.success,
    borderRadius: borderRadius.md,
  },
  saveButtonText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  
  // Search and Filter Section
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  searchInput: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
    backgroundColor: colors.background,
  },
  filterButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    minWidth: 80,
    alignItems: 'center',
  },
  filterButtonText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },

  // Content Area
  content: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  leadsContainer: {
    padding: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },

  // Lead Cards
  leadCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.md,
    elevation: 2,
  },
  leadHeader: {
    marginBottom: spacing.sm,
  },
  leadMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  leadMetaText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  leadContent: {
    marginBottom: spacing.sm,
  },
  leadContentLabel: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  leadContentText: {
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 20,
  },
  leadFile: {
    marginBottom: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  leadFileText: {
    fontSize: fontSize.sm,
    color: colors.info,
    fontWeight: '500',
  },
  leadFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  leadStatusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    minWidth: 80,
    alignItems: 'center',
  },
  leadStatusText: {
    color: colors.white,
    fontSize: fontSize.xs,
    fontWeight: '600',
    textTransform: 'capitalize',
  },

  // Empty State
  emptyState: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    marginTop: spacing.lg,
    ...shadows.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyStateText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  emptyStateSubtext: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },

  // Filter Modal
  filterOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  filterOverlayTouchable: {
    flex: 1,
  },
  filterContainer: {
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingTop: spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? spacing.xl + 20 : spacing.xl,
    maxHeight: screenHeight * 0.8,
    ...shadows.lg,
    elevation: 10,
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    position: 'relative',
  },
  filterTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  filterCloseButton: {
    position: 'absolute',
    right: spacing.lg,
    top: -4,
    padding: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.backgroundSecondary,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterCloseText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  filterContent: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  filterGroup: {
    marginBottom: spacing.xl,
  },
  filterLabel: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  filterOptions: {
    flexDirection: 'row',
    paddingVertical: spacing.sm,
  },
  filterOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
    minWidth: 80,
    alignItems: 'center',
  },
  filterOptionSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterOptionText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '500',
    textAlign: 'center',
  },
  filterOptionTextSelected: {
    color: colors.white,
    fontWeight: '600',
  },
  filterButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.md,
  },
  filterClearButton: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.backgroundSecondary,
    alignItems: 'center',
  },
  filterClearText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  filterApplyButton: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    elevation: 3,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  filterApplyText: {
    fontSize: fontSize.md,
    color: colors.white,
    fontWeight: '600',
  },

  // Dropdown Component
  dropdownContainer: {
    marginBottom: spacing.sm,
  },
  dropdownButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 48,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  dropdownButtonText: {
    fontSize: fontSize.md,
    color: colors.text,
    flex: 1,
  },
  dropdownPlaceholder: {
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  dropdownArrow: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
  },
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  dropdownModal: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    maxHeight: screenHeight * 0.6,
    ...shadows.md,
    elevation: 8,
  },
  dropdownList: {
    maxHeight: screenHeight * 0.5,
    padding: spacing.sm,
  },
  dropdownItem: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dropdownItemSelected: {
    backgroundColor: colors.primary + '15',
  },
  dropdownItemText: {
    fontSize: fontSize.md,
    color: colors.text,
  },
  dropdownItemTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },

  // Detail Screen Styles
  detailContent: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  detailSection: {
    backgroundColor: colors.white,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.md,
    elevation: 2,
  },
  formRow: {
    marginBottom: spacing.lg,
  },
  fieldLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  nonEditableField: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.backgroundSecondary,
  },
  nonEditableText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  editableField: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
    backgroundColor: colors.white,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },

  // Comments Section
  commentItem: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  commentHeader: {
    marginBottom: spacing.sm,
  },
  commentMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  commentBy: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
  },
  commentTime: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  commentPhase: {
    fontSize: fontSize.sm,
    color: colors.info,
    fontWeight: '500',
  },
  commentSubphase: {
    fontSize: fontSize.sm,
    color: colors.info,
    fontWeight: '500',
  },
  commentContent: {
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  fileDownload: {
    backgroundColor: colors.primary + '15',
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
  },
  fileDownloadText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: '500',
  },
  noCommentsText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
    paddingVertical: spacing.lg,
  },

  // Add Comment Section
  commentActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  defaultCommentsButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  defaultCommentsText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: '500',
  },
  attachDocButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.info,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  attachDocText: {
    fontSize: fontSize.sm,
    color: colors.info,
    fontWeight: '500',
  },
  commentInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    backgroundColor: colors.white,
    fontSize: fontSize.sm,
    color: colors.text,
    marginBottom: spacing.md,
    textAlignVertical: 'top',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  addCommentButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    elevation: 3,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  addCommentText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: '600',
  },

  // Default Comments Modal
  defaultCommentsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  defaultCommentsModal: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    maxHeight: screenHeight * 0.6,
    ...shadows.md,
    elevation: 8,
  },
  defaultCommentsTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  defaultCommentsList: {
    maxHeight: screenHeight * 0.4,
    padding: spacing.sm,
  },
  defaultCommentItem: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  defaultCommentItemText: {
    fontSize: fontSize.md,
    color: colors.text,
  },
});

export default BDT;