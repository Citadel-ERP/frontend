import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView,
  StatusBar, Alert, Modal, TextInput, FlatList, Dimensions, ActivityIndicator
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, borderRadius, shadows } from '../styles/theme';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface BDTProps { onBack: () => void; }

interface Lead {
  id: string; name: string; email: string; phone: string; company: string;
  status: 'active' | 'hold' | 'mandate' | 'closed'; phase: string; subphase: string;
  collaborators: string[]; createdAt: string; comments: Comment[];
}

interface Comment {
  id: string; commentBy: string; date: string; phase: string; subphase: string;
  content: string; hasFile?: boolean; fileName?: string;
}

interface FilterOption { value: string; label: string; }

interface DropdownModalProps {
  visible: boolean; onClose: () => void; options: FilterOption[];
  onSelect: (value: string) => void; title: string; searchable?: boolean;
}

const DropdownModal: React.FC<DropdownModalProps> = ({ 
  visible, onClose, options, onSelect, title, searchable = false 
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  
  const filteredOptions = searchable 
    ? options.filter(option => option.label.toLowerCase().includes(searchQuery.toLowerCase()))
    : options;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
          <View style={styles.dropdownContainer}>
            <Text style={styles.dropdownTitle}>{title}</Text>
            {searchable && (
              <View style={styles.searchContainer}>
                <TextInput
                  style={styles.searchInput}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search..."
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
            )}
            <FlatList
              data={filteredOptions}
              keyExtractor={(item) => item.value}
              showsVerticalScrollIndicator={false}
              style={styles.dropdownList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.dropdownItem}
                  onPress={() => { onSelect(item.value); onClose(); }}
                >
                  <Text style={styles.dropdownItemText}>{item.label}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={() => (
                <View style={styles.emptyDropdown}>
                  <Text style={styles.emptyDropdownText}>No options found</Text>
                </View>
              )}
            />
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const BDT: React.FC<BDTProps> = ({ onBack }) => {
  const insets = useSafeAreaInsets();
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBy, setFilterBy] = useState('');
  const [filterValue, setFilterValue] = useState('');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [loading, setLoading] = useState(false);

  const [leads, setLeads] = useState<Lead[]>([
    {
      id: '1', name: 'John Doe', email: 'john.doe@example.com', phone: '+91 9876543210',
      company: 'Tech Solutions Inc', status: 'active', phase: 'presentation', subphase: 'initial_contact',
      collaborators: ['Alice Smith', 'Bob Johnson'], createdAt: '2024-01-15T10:30:00Z',
      comments: [{
        id: '1', commentBy: 'Alice Smith', date: '2024-01-15T14:30:00Z',
        phase: 'presentation', subphase: 'initial_contact',
        content: 'Initial contact made via phone call. Client showed interest in our CRM solution.',
        hasFile: true, fileName: 'initial_discussion.pdf'
      }]
    },
    {
      id: '2', name: 'Sarah Wilson', email: 'sarah.wilson@corp.com', phone: '+91 8765432109',
      company: 'Corporate Systems', status: 'hold', phase: 'closing', subphase: 'contract',
      collaborators: ['Mike Davis'], createdAt: '2024-01-10T08:45:00Z', comments: []
    }
  ]);

  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [newComment, setNewComment] = useState('');
  const [newCollaborator, setNewCollaborator] = useState('');
  const [showDefaultComments, setShowDefaultComments] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<'status' | 'phase' | 'subphase' | 'filter' | null>(null);

  const STATUS_CHOICES: FilterOption[] = [
    { value: 'active', label: 'Active' },
    { value: 'hold', label: 'Hold' },
    { value: 'mandate', label: 'Mandate' },
    { value: 'closed', label: 'Closed' }
  ];

  const PHASE_CHOICES: FilterOption[] = [
    { value: 'presentation', label: 'Presentation' },
    { value: 'negotiation', label: 'Negotiation' },
    { value: 'closing', label: 'Closing' }
  ];

  const SUBPHASE_CHOICES: FilterOption[] = [
    { value: 'initial_contact', label: 'Initial Contact' },
    { value: 'contract', label: 'Contract' },
    { value: 'follow_up', label: 'Follow Up' }
  ];

  const FILTER_OPTIONS: FilterOption[] = [
    { value: '', label: 'All Leads' },
    { value: 'status', label: 'Filter by Status' },
    { value: 'phase', label: 'Filter by Phase' },
    { value: 'subphase', label: 'Filter by Subphase' }
  ];

  const DEFAULT_COMMENTS = [
    'Follow up call scheduled',
    'Proposal sent to client',
    'Meeting scheduled for next week',
    'Demo completed successfully',
    'Awaiting client response',
    'Contract under review',
    'Price negotiation in progress'
  ];

  // Filter leads
  const filteredLeads = leads.filter(lead => {
    const matchesSearch = !searchQuery || 
      lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    let matchesFilter = true;
    if (filterBy && filterValue) {
      matchesFilter = lead[filterBy as keyof Lead] === filterValue;
    }

    return matchesSearch && matchesFilter;
  });

  const handleLeadPress = (lead: Lead) => {
    setSelectedLead({ ...lead });
    setViewMode('detail');
    setIsEditMode(false);
  };

  const handleBackToList = () => {
    setViewMode('list');
    setSelectedLead(null);
    setIsEditMode(false);
    setNewComment('');
    setNewCollaborator('');
  };

  const handleSave = () => {
    if (!selectedLead) return;
    
    setLoading(true);
    setTimeout(() => {
      const updatedLeads = leads.map(lead => 
        lead.id === selectedLead.id ? selectedLead : lead
      );
      setLeads(updatedLeads);
      setIsEditMode(false);
      setLoading(false);
      Alert.alert('Success', 'Lead updated successfully!');
    }, 1000);
  };

  const handleAddComment = () => {
    if (!newComment.trim() || !selectedLead) {
      Alert.alert('Error', 'Please enter a comment');
      return;
    }

    const comment: Comment = {
      id: Date.now().toString(),
      commentBy: 'Current User',
      date: new Date().toISOString(),
      phase: selectedLead.phase,
      subphase: selectedLead.subphase,
      content: newComment.trim()
    };

    setSelectedLead({
      ...selectedLead,
      comments: [...selectedLead.comments, comment]
    });
    setNewComment('');
  };

  const handleAddCollaborator = () => {
    if (!newCollaborator.trim() || !selectedLead) return;
    
    if (!selectedLead.collaborators.includes(newCollaborator.trim())) {
      setSelectedLead({
        ...selectedLead,
        collaborators: [...selectedLead.collaborators, newCollaborator.trim()]
      });
    }
    setNewCollaborator('');
  };

  const handleRemoveCollaborator = (collaborator: string) => {
    if (!selectedLead) return;
    
    setSelectedLead({
      ...selectedLead,
      collaborators: selectedLead.collaborators.filter(c => c !== collaborator)
    });
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'active': return colors.success;
      case 'hold': return colors.warning;
      case 'mandate': return colors.info;
      case 'closed': return colors.error;
      default: return colors.textSecondary;
    }
  };

  const getFilterLabel = (filterKey: string, value: string): string => {
    let choices: FilterOption[] = [];
    switch (filterKey) {
      case 'status': choices = STATUS_CHOICES; break;
      case 'phase': choices = PHASE_CHOICES; break;
      case 'subphase': choices = SUBPHASE_CHOICES; break;
    }
    const option = choices.find(choice => choice.value === value);
    return option ? option.label : value;
  };

  const BackIcon = () => (
    <View style={styles.backIcon}>
      <View style={styles.backArrow} />
    </View>
  );

  if (viewMode === 'detail' && selectedLead) {
    return (
      <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBackToList}>
            <BackIcon />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Lead Details</Text>
          {!isEditMode ? (
            <TouchableOpacity style={styles.editButton} onPress={() => setIsEditMode(true)}>
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={loading}>
              {loading ? (
                <ActivityIndicator color={colors.white} size="small" />
              ) : (
                <Text style={styles.saveButtonText}>Save</Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        <ScrollView style={styles.detailScrollView} showsVerticalScrollIndicator={false}>
          {/* Lead Header */}
          <View style={styles.detailCard}>
            <View style={styles.leadHeader}>
              <View style={styles.leadInfo}>
                <Text style={styles.leadName}>{selectedLead.name}</Text>
                <Text style={styles.leadCompany}>{selectedLead.company}</Text>
                <Text style={styles.leadDate}>Created: {formatDate(selectedLead.createdAt)}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedLead.status) }]}>
                <Text style={styles.statusBadgeText}>{selectedLead.status.toUpperCase()}</Text>
              </View>
            </View>
          </View>

          {/* Contact Information */}
          <View style={styles.detailCard}>
            <Text style={styles.sectionTitle}>Contact Information</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={[styles.input, !isEditMode && styles.inputDisabled]}
                value={selectedLead.email}
                onChangeText={isEditMode ? (text) => setSelectedLead({...selectedLead, email: text}) : undefined}
                editable={isEditMode}
                keyboardType="email-address"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Phone</Text>
              <TextInput
                style={[styles.input, !isEditMode && styles.inputDisabled]}
                value={selectedLead.phone}
                onChangeText={isEditMode ? (text) => setSelectedLead({...selectedLead, phone: text}) : undefined}
                editable={isEditMode}
                keyboardType="phone-pad"
              />
            </View>
          </View>

          {/* Lead Management */}
          <View style={styles.detailCard}>
            <Text style={styles.sectionTitle}>Lead Management</Text>
            
            <View style={styles.managementRow}>
              <View style={styles.managementItem}>
                <Text style={styles.inputLabel}>Status</Text>
                {isEditMode ? (
                  <TouchableOpacity
                    style={styles.dropdown}
                    onPress={() => setActiveDropdown('status')}
                  >
                    <Text style={styles.dropdownText}>
                      {getFilterLabel('status', selectedLead.status)}
                    </Text>
                    <Text style={styles.dropdownArrow}>▼</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.readOnlyField}>
                    <Text style={styles.readOnlyText}>
                      {getFilterLabel('status', selectedLead.status)}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.managementItem}>
                <Text style={styles.inputLabel}>Phase</Text>
                {isEditMode ? (
                  <TouchableOpacity
                    style={styles.dropdown}
                    onPress={() => setActiveDropdown('phase')}
                  >
                    <Text style={styles.dropdownText}>
                      {getFilterLabel('phase', selectedLead.phase)}
                    </Text>
                    <Text style={styles.dropdownArrow}>▼</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.readOnlyField}>
                    <Text style={styles.readOnlyText}>
                      {getFilterLabel('phase', selectedLead.phase)}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Subphase</Text>
              {isEditMode ? (
                <TouchableOpacity
                  style={styles.dropdown}
                  onPress={() => setActiveDropdown('subphase')}
                >
                  <Text style={styles.dropdownText}>
                    {getFilterLabel('subphase', selectedLead.subphase)}
                  </Text>
                  <Text style={styles.dropdownArrow}>▼</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.readOnlyField}>
                  <Text style={styles.readOnlyText}>
                    {getFilterLabel('subphase', selectedLead.subphase)}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Collaborators */}
          <View style={styles.detailCard}>
            <Text style={styles.sectionTitle}>Collaborators</Text>
            {selectedLead.collaborators.map((collaborator, index) => (
              <View key={index} style={styles.collaboratorItem}>
                <Text style={styles.collaboratorName}>{collaborator}</Text>
                {isEditMode && (
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => handleRemoveCollaborator(collaborator)}
                  >
                    <Text style={styles.removeButtonText}>×</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
            {isEditMode && (
              <View style={styles.addCollaboratorContainer}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={newCollaborator}
                  onChangeText={setNewCollaborator}
                  placeholder="Add collaborator..."
                  placeholderTextColor={colors.textSecondary}
                />
                <TouchableOpacity style={styles.addButton} onPress={handleAddCollaborator}>
                  <Text style={styles.addButtonText}>+</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Comments Section */}
          <View style={styles.detailCard}>
            <Text style={styles.sectionTitle}>Comments ({selectedLead.comments.length})</Text>
            
            {selectedLead.comments.length > 0 ? (
              selectedLead.comments.map((comment) => (
                <View key={comment.id} style={styles.commentItem}>
                  <View style={styles.commentHeaderRow}>
                    <View style={styles.commentMetaItem}>
                      <Text style={styles.commentLabel}>Comment By:</Text>
                      <Text style={styles.commentValue}>{comment.commentBy}</Text>
                    </View>
                    <View style={styles.commentMetaItem}>
                      <Text style={styles.commentLabel}>Date:</Text>
                      <Text style={styles.commentValue}>{formatDate(comment.date)}</Text>
                    </View>
                  </View>
                  <View style={styles.commentHeaderRow}>
                    <View style={styles.commentMetaItem}>
                      <Text style={styles.commentLabel}>Phase:</Text>
                      <Text style={styles.commentValue}>{comment.phase}</Text>
                    </View>
                    <View style={styles.commentMetaItem}>
                      <Text style={styles.commentLabel}>Subphase:</Text>
                      <Text style={styles.commentValue}>{comment.subphase}</Text>
                    </View>
                  </View>
                  <View style={styles.commentContentRow}>
                    <Text style={styles.commentLabel}>Content:</Text>
                    <Text style={styles.commentContentText}>{comment.content}</Text>
                  </View>
                  {comment.hasFile && (
                    <TouchableOpacity style={styles.fileButton}>
                      <Text style={styles.fileButtonText}>📎 {comment.fileName}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))
            ) : (
              <View style={styles.emptyComments}>
                <Text style={styles.emptyCommentsText}>No comments yet</Text>
                <Text style={styles.emptyCommentsSubtext}>Start the conversation by adding a comment below</Text>
              </View>
            )}

            {/* Add Comment Section */}
            <View style={styles.addCommentSection}>
              <View style={styles.commentActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => setShowDefaultComments(true)}
                >
                  <Text style={styles.actionButtonText}>Default Comments</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton}>
                  <Text style={styles.actionButtonText}>📎 Attach</Text>
                </TouchableOpacity>
              </View>

              <TextInput
                style={styles.commentInput}
                value={newComment}
                onChangeText={setNewComment}
                placeholder="Add your comment here..."
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                placeholderTextColor={colors.textSecondary}
              />

              <TouchableOpacity style={styles.submitButton} onPress={handleAddComment}>
                <Text style={styles.submitButtonText}>Add Comment</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Modals */}
        <DropdownModal
          visible={activeDropdown === 'status'}
          onClose={() => setActiveDropdown(null)}
          options={STATUS_CHOICES}
          onSelect={(value) => setSelectedLead({...selectedLead, status: value as Lead['status']})}
          title="Select Status"
        />
        <DropdownModal
          visible={activeDropdown === 'phase'}
          onClose={() => setActiveDropdown(null)}
          options={PHASE_CHOICES}
          onSelect={(value) => setSelectedLead({...selectedLead, phase: value})}
          title="Select Phase"
        />
        <DropdownModal
          visible={activeDropdown === 'subphase'}
          onClose={() => setActiveDropdown(null)}
          options={SUBPHASE_CHOICES}
          onSelect={(value) => setSelectedLead({...selectedLead, subphase: value})}
          title="Select Subphase"
        />

        <Modal visible={showDefaultComments} transparent animationType="fade" onRequestClose={() => setShowDefaultComments(false)}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowDefaultComments(false)}>
            <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
              <View style={styles.defaultCommentsModal}>
                <Text style={styles.modalTitle}>Default Comments</Text>
                <ScrollView style={styles.defaultCommentsList}>
                  {DEFAULT_COMMENTS.map((comment, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.defaultCommentItem}
                      onPress={() => {
                        setNewComment(comment);
                        setShowDefaultComments(false);
                      }}
                    >
                      <Text style={styles.defaultCommentText}>{comment}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
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
        <Text style={styles.headerTitle}>BDT Module</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Search and Filter */}
      <View style={styles.searchFilterContainer}>
        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search leads..."
            value={searchQuery}
            onChangeText={setSearchQuery}
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
      </View>

      {filterBy && filterValue && (
        <View style={styles.activeFilterContainer}>
          <Text style={styles.activeFilterText}>
            {getFilterLabel(filterBy, filterValue)}
          </Text>
          <TouchableOpacity onPress={() => { setFilterBy(''); setFilterValue(''); }}>
            <Text style={styles.clearFilterText}>Clear</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.contentContainer}>
        <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Leads ({filteredLeads.length}{filteredLeads.length !== leads.length && ` of ${leads.length}`})
            </Text>
            
            {filteredLeads.length > 0 ? (
              filteredLeads.map((lead) => (
                <TouchableOpacity
                  key={lead.id}
                  style={styles.leadCard}
                  onPress={() => handleLeadPress(lead)}
                >
                  <View style={styles.leadCardHeader}>
                    <View style={styles.leadCardInfo}>
                      <Text style={styles.leadCardName}>{lead.name}</Text>
                      <Text style={styles.leadCardCompany}>{lead.company}</Text>
                    </View>
                    <View style={[styles.leadStatusBadge, { backgroundColor: getStatusColor(lead.status) }]}>
                      <Text style={styles.leadStatusText}>{lead.status.charAt(0).toUpperCase() + lead.status.slice(1)}</Text>
                    </View>
                  </View>
                  <Text style={styles.leadCardContact} numberOfLines={1}>
                    {lead.email} • {lead.phone}
                  </Text>
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>
                  {searchQuery || filterValue ? 'No leads match your criteria' : 'No leads found'}
                </Text>
                <Text style={styles.emptyStateSubtext}>
                  {searchQuery || filterValue ? 'Try adjusting your search or filters' : 'Your leads will appear here'}
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </View>

      {/* Filter Modal */}
      <DropdownModal
        visible={activeDropdown === 'filter'}
        onClose={() => setActiveDropdown(null)}
        options={FILTER_OPTIONS}
        onSelect={(value) => {
          setFilterBy(value);
          if (!value) setFilterValue('');
          else {
            // Show secondary dropdown for filter value
            setTimeout(() => {
              if (value === 'status') setActiveDropdown('status');
              else if (value === 'phase') setActiveDropdown('phase');
              else if (value === 'subphase') setActiveDropdown('subphase');
            }, 300);
          }
        }}
        title="Filter Options"
      />

      {/* Secondary filter dropdowns */}
      <DropdownModal
        visible={activeDropdown === 'status' && !selectedLead}
        onClose={() => setActiveDropdown(null)}
        options={STATUS_CHOICES}
        onSelect={(value) => setFilterValue(value)}
        title="Select Status"
      />
      <DropdownModal
        visible={activeDropdown === 'phase' && !selectedLead}
        onClose={() => setActiveDropdown(null)}
        options={PHASE_CHOICES}
        onSelect={(value) => setFilterValue(value)}
        title="Select Phase"
      />
      <DropdownModal
        visible={activeDropdown === 'subphase' && !selectedLead}
        onClose={() => setActiveDropdown(null)}
        options={SUBPHASE_CHOICES}
        onSelect={(value) => setFilterValue(value)}
        title="Select Subphase"
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
  backButton: { padding: spacing.sm, borderRadius: borderRadius.sm },
  backIcon: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  backArrow: {
    width: 12, height: 12, borderLeftWidth: 2, borderTopWidth: 2,
    borderColor: colors.white, transform: [{ rotate: '-45deg' }],
  },
  headerTitle: {
    fontSize: fontSize.xl, fontWeight: '600', color: colors.white, flex: 1, textAlign: 'center',
  },
  headerSpacer: { width: 40 },
  editButton: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    backgroundColor: colors.info, borderRadius: borderRadius.lg, ...shadows.sm,
  },
  editButtonText: { color: colors.white, fontSize: fontSize.sm, fontWeight: '600' },
  saveButton: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    backgroundColor: colors.success, borderRadius: borderRadius.lg, ...shadows.sm,
  },
  saveButtonText: { color: colors.white, fontSize: fontSize.sm, fontWeight: '600' },

  searchFilterContainer: {
    flexDirection: 'row', paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    backgroundColor: colors.primary, gap: spacing.md,
  },
  searchContainer: {
    flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white,
    borderRadius: borderRadius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, ...shadows.sm,
  },
  searchIcon: { fontSize: fontSize.lg, marginRight: spacing.sm },
  searchInput: { flex: 1, fontSize: fontSize.md, color: colors.text, paddingVertical: spacing.sm },
  filterButton: {
    backgroundColor: colors.white, borderRadius: borderRadius.lg, paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm, justifyContent: 'center', alignItems: 'center', ...shadows.sm,
    flexDirection: 'row', gap: spacing.xs,
  },
  filterIcon: { fontSize: fontSize.md },
  filterText: { fontSize: fontSize.sm, color: colors.text, fontWeight: '500' },

  activeFilterContainer: {
    backgroundColor: colors.info + '20', paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  activeFilterText: { fontSize: fontSize.sm, color: colors.info, fontWeight: '600' },
  clearFilterText: { fontSize: fontSize.sm, color: colors.error, fontWeight: '600' },

  contentContainer: { flex: 1, backgroundColor: colors.backgroundSecondary },
  tabContent: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  section: { marginBottom: spacing.xl },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: '600', color: colors.text, marginBottom: spacing.md },

  leadCard: {
    backgroundColor: colors.white, padding: spacing.lg, borderRadius: borderRadius.lg,
    marginBottom: spacing.md, ...shadows.md, borderWidth: 1, borderColor: colors.border,
  },
  leadCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.sm },
  leadCardInfo: { flex: 1, marginRight: spacing.sm },
  leadCardName: { fontSize: fontSize.md, fontWeight: '600', color: colors.text, marginBottom: spacing.xs },
  leadCardCompany: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: '500' },
  leadStatusBadge: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: borderRadius.full,
    minWidth: 80, alignItems: 'center',
  },
  leadStatusText: { color: colors.white, fontSize: fontSize.xs, fontWeight: '600' },
  leadCardContact: { fontSize: fontSize.sm, color: colors.textSecondary, marginBottom: spacing.sm },

  emptyState: {
    backgroundColor: colors.white, borderRadius: borderRadius.lg, padding: spacing.xl,
    alignItems: 'center', ...shadows.md, borderWidth: 1, borderColor: colors.border,
  },
  emptyStateText: { fontSize: fontSize.md, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.xs },
  emptyStateSubtext: { fontSize: fontSize.sm, color: colors.textSecondary, textAlign: 'center', fontStyle: 'italic' },

  // Detail View Styles
  detailScrollView: { flex: 1, backgroundColor: colors.backgroundSecondary },
  detailCard: {
    backgroundColor: colors.white, marginHorizontal: spacing.lg, marginBottom: spacing.lg,
    padding: spacing.lg, borderRadius: borderRadius.xl, ...shadows.md,
  },

  leadHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.md },
  leadInfo: { flex: 1 },
  leadName: { fontSize: fontSize.xxl, fontWeight: '700', color: colors.text, marginBottom: spacing.xs },
  leadCompany: { fontSize: fontSize.md, color: colors.textSecondary, fontWeight: '500', marginBottom: spacing.sm },
  leadDate: { fontSize: fontSize.sm, color: colors.textLight },
  statusBadge: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.lg,
    alignItems: 'center', minWidth: 90,
  },
  statusBadgeText: { color: colors.white, fontSize: fontSize.sm, fontWeight: '700', letterSpacing: 0.5 },

  inputGroup: { marginBottom: spacing.md },
  inputLabel: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text, marginBottom: spacing.sm },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md, fontSize: fontSize.md,
    color: colors.text, backgroundColor: colors.white, ...shadows.sm,
  },
  inputDisabled: { backgroundColor: colors.gray, color: colors.textSecondary },

  managementRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  managementItem: { flex: 1 },
  dropdown: {
    borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md, backgroundColor: colors.white,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', ...shadows.sm,
  },
  dropdownText: { fontSize: fontSize.md, color: colors.text, flex: 1 },
  dropdownArrow: { fontSize: fontSize.sm, color: colors.textSecondary },
  readOnlyField: {
    backgroundColor: colors.gray, borderRadius: borderRadius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.md,
  },
  readOnlyText: { fontSize: fontSize.md, color: colors.textSecondary },

  collaboratorItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.backgroundSecondary, padding: spacing.md, borderRadius: borderRadius.md, marginBottom: spacing.sm,
  },
  collaboratorName: { fontSize: fontSize.md, color: colors.text, fontWeight: '500' },
  removeButton: {
    backgroundColor: colors.error, width: 24, height: 24, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  removeButtonText: { color: colors.white, fontSize: fontSize.lg, fontWeight: '600' },
  addCollaboratorContainer: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-end' },
  addButton: {
    backgroundColor: colors.primary, width: 40, height: 40, borderRadius: borderRadius.lg,
    alignItems: 'center', justifyContent: 'center', ...shadows.sm,
  },
  addButtonText: { color: colors.white, fontSize: fontSize.lg, fontWeight: '600' },

  commentItem: {
    backgroundColor: colors.white, padding: spacing.lg, borderRadius: borderRadius.lg,
    marginBottom: spacing.md, ...shadows.sm, borderLeftWidth: 4, borderLeftColor: colors.info,
  },
  commentHeaderRow: { 
    flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm,
  },
  commentMetaItem: { flex: 1, marginRight: spacing.sm },
  commentLabel: { 
    fontSize: fontSize.xs, color: colors.textSecondary, fontWeight: '600', marginBottom: spacing.xs,
  },
  commentValue: { fontSize: fontSize.sm, color: colors.text, fontWeight: '500' },
  commentContentRow: { marginTop: spacing.sm },
  commentContentText: { 
    fontSize: fontSize.md, color: colors.text, lineHeight: 22, marginTop: spacing.xs,
    backgroundColor: colors.backgroundSecondary, padding: spacing.md, borderRadius: borderRadius.md,
  },
  fileButton: { backgroundColor: colors.info + '20', paddingHorizontal: spacing.sm, paddingVertical: spacing.sm, borderRadius: borderRadius.sm, alignSelf: 'flex-start' },
  fileButtonText: { fontSize: fontSize.sm, color: colors.info, fontWeight: '500' },

  emptyComments: { alignItems: 'center', paddingVertical: spacing.xl },
  emptyCommentsText: { fontSize: fontSize.lg, fontWeight: '600', color: colors.textSecondary, marginBottom: spacing.sm },
  emptyCommentsSubtext: { fontSize: fontSize.sm, color: colors.textLight, textAlign: 'center' },

  addCommentSection: { marginTop: spacing.lg, paddingTop: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border },
  commentActions: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  actionButton: {
    flex: 1, paddingVertical: spacing.md, paddingHorizontal: spacing.md, borderWidth: 1,
    borderColor: colors.primary, borderRadius: borderRadius.lg, alignItems: 'center',
    backgroundColor: colors.primary + '10',
  },
  actionButtonText: { fontSize: fontSize.sm, color: colors.primary, fontWeight: '600' },
  commentInput: {
    borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.lg, padding: spacing.md,
    backgroundColor: colors.white, fontSize: fontSize.sm, color: colors.text, marginBottom: spacing.md,
    textAlignVertical: 'top', minHeight: 100, ...shadows.sm,
  },
  submitButton: {
    backgroundColor: colors.primary, paddingVertical: spacing.md, paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg, alignItems: 'center', ...shadows.md,
  },
  submitButtonText: { color: colors.white, fontSize: fontSize.md, fontWeight: '600' },

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', paddingHorizontal: spacing.xl },
  dropdownContainer: {
    backgroundColor: colors.white, borderRadius: borderRadius.xl, maxHeight: screenHeight * 0.6, ...shadows.lg,
  },
  dropdownTitle: {
    fontSize: fontSize.lg, fontWeight: '600', color: colors.text, textAlign: 'center',
    padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  dropdownList: { maxHeight: screenHeight * 0.4 },
  dropdownItem: { paddingHorizontal: spacing.md, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  dropdownItemText: { fontSize: fontSize.md, color: colors.text, fontWeight: '500' },
  emptyDropdown: { padding: spacing.xl, alignItems: 'center' },
  emptyDropdownText: { fontSize: fontSize.md, color: colors.textSecondary, textAlign: 'center' },

  defaultCommentsModal: { backgroundColor: colors.white, borderRadius: borderRadius.xl, maxHeight: screenHeight * 0.6, ...shadows.lg },
  modalTitle: {
    fontSize: fontSize.lg, fontWeight: '600', color: colors.text, textAlign: 'center',
    padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  defaultCommentsList: { maxHeight: screenHeight * 0.4, padding: spacing.sm },
  defaultCommentItem: { paddingHorizontal: spacing.md, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  defaultCommentText: { fontSize: fontSize.md, color: colors.text },
});
export default BDT;