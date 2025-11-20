import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView,
  StatusBar, Alert, Modal, TextInput, FlatList, Dimensions, ActivityIndicator
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { BACKEND_URL } from '../../config/config';
import { colors, spacing, fontSize, borderRadius, shadows } from '../../styles/theme';
import {
  DropdownModalProps, LeadCardProps, DetailViewProps, 
  CreateLeadViewProps, DefaultCommentsViewProps, FilterOption, PotentialCollaborator
} from './BUP.types';
import { beautifyName, formatDate, formatTime, formatDateTime, getStatusColor } from './BUP.utils';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const STATUS_CHOICES: FilterOption[] = [
  { value: 'active', label: 'Active' },
  { value: 'hold', label: 'Hold' },
  { value: 'mandate', label: 'Mandate' },
  { value: 'closed', label: 'Closed' },
  { value: 'no-requirement', label: 'No Requirement' },
  { value: 'transaction-complete', label: 'Transaction Complete' },
  { value: 'non-responsive', label: 'Non Responsive' }
];

export const BackIcon = () => (
  <View style={componentStyles.backIcon}>
    <View style={componentStyles.backArrow} />
  </View>
);

export const DropdownModal: React.FC<DropdownModalProps> = ({ 
  visible, onClose, options, onSelect, title, searchable = false 
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  
  const filteredOptions = searchable 
    ? options.filter(option => option.label.toLowerCase().includes(searchQuery.toLowerCase()))
    : options;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={componentStyles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
          <View style={componentStyles.dropdownContainer}>
            <Text style={componentStyles.dropdownTitle}>{title}</Text>
            {searchable && (
              <View style={componentStyles.searchContainer}>
                <TextInput
                  style={componentStyles.searchInput}
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
              style={componentStyles.dropdownList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={componentStyles.dropdownItem}
                  onPress={() => { onSelect(item.value); onClose(); }}
                >
                  <Text style={componentStyles.dropdownItemText}>{item.label}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={() => (
                <View style={componentStyles.emptyDropdown}>
                  <Text style={componentStyles.emptyDropdownText}>No options found</Text>
                </View>
              )}
            />
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

export const LeadCard: React.FC<LeadCardProps> = ({ lead, onPress }) => {
  return (
    <TouchableOpacity style={componentStyles.leadCard} onPress={onPress}>
      <View style={componentStyles.leadCardHeader}>
        <View style={componentStyles.leadCardInfo}>
          <Text style={componentStyles.leadCardName} numberOfLines={1}>{lead.name}</Text>
          <View style={componentStyles.leadCardStatusRow}>
            <View style={[componentStyles.leadStatusDot, { backgroundColor: getStatusColor(lead.status) }]} />
            <Text style={componentStyles.leadCardStatusText}>{beautifyName(lead.status)}</Text>
          </View>
          <Text style={componentStyles.leadCardCompany} numberOfLines={1}>
            {lead.company || 'No company'}
          </Text>
        </View>
      </View>
      
      <Text style={componentStyles.leadCardContact} numberOfLines={1}>
        {lead.emails && lead.emails.length > 0 
          ? lead.emails.map(e => e.email).join(', ') 
          : 'No email'} • {lead.phone_numbers && lead.phone_numbers.length > 0 
          ? lead.phone_numbers.map(p => p.number).join(', ') 
          : 'No phone'}
      </Text>

      <View style={componentStyles.leadCardMeta}>
        <Text style={componentStyles.leadCardPhase}>
          {beautifyName(lead.phase)} → {beautifyName(lead.subphase)}
        </Text>
        <Text style={componentStyles.leadCardAssigned}>
          👤 {lead.assigned_to.full_name}
        </Text>
      </View>
      
      <View style={componentStyles.leadCardFooter}>
        <View style={componentStyles.leadCardDateContainer}>
          <Text style={componentStyles.leadCardDate}>
            {formatDate(lead.created_at || lead.createdAt)}
          </Text>
          <Text style={componentStyles.leadCardTime}>
            {formatTime(lead.created_at || lead.createdAt)}
          </Text>
        </View>
        {lead.collaborators && lead.collaborators.length > 0 && (
          <View style={componentStyles.collaboratorBadge}>
            <Text style={componentStyles.collaboratorBadgeText}>
              +{lead.collaborators.length}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

export const DetailView: React.FC<DetailViewProps> = ({
  insets, selectedLead, setSelectedLead, isEditMode, setIsEditMode, onBack,
  comments, setComments, collaborators, loadingComments, loadingCollaborators,
  commentsPagination, loadingMoreComments, editingEmails, setEditingEmails,
  editingPhones, setEditingPhones, newEmail, setNewEmail, newPhone, setNewPhone,
  newComment, setNewComment, newCollaborator, setNewCollaborator,
  showDefaultComments, setShowDefaultComments, defaultComments, loadingDefaultComments,
  selectedDocuments, setSelectedDocuments, addingComment,
  potentialCollaborators, setPotentialCollaborators, showPotentialCollaborators,
  setShowPotentialCollaborators, loadingPotentialCollaborators,
  activeDropdown, setActiveDropdown, allPhases, allSubphases, loading, token,
  fetchSubphases, fetchComments, fetchCollaborators
}) => {
  
  const [collaboratorSearchTimeout, setCollaboratorSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  const handleSave = async () => {
    if (!selectedLead || !token) return;
    
    try {
      const updatePayload: any = {
        token: token,
        lead_id: selectedLead.id
      };

      if (editingEmails.length > 0) updatePayload.emails = editingEmails;
      if (editingPhones.length > 0) updatePayload.phone_numbers = editingPhones;
      if (selectedLead.status) updatePayload.status = selectedLead.status;
      if (selectedLead.phase) updatePayload.phase = selectedLead.phase;
      if (selectedLead.subphase) updatePayload.subphase = selectedLead.subphase;

      const response = await fetch(`${BACKEND_URL}/citadel_admin/updateLead`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload)
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();
      const updatedLead = {
        ...data.lead,
        createdAt: data.lead.created_at,
        collaborators: collaborators,
        comments: []
      };
      
      setSelectedLead(updatedLead);
      Alert.alert('Success', 'Lead updated successfully!');
      setIsEditMode(false);
    } catch (error) {
      console.error('Error updating lead:', error);
      Alert.alert('Error', 'Failed to update lead.');
    }
  };

  const handleAddEmail = () => {
    if (!newEmail.trim()) {
      Alert.alert('Error', 'Please enter a valid email');
      return;
    }
    if (editingEmails.includes(newEmail.trim())) {
      Alert.alert('Error', 'This email already exists');
      return;
    }
    setEditingEmails([...editingEmails, newEmail.trim()]);
    setNewEmail('');
  };

  const handleRemoveEmail = (index: number) => {
    setEditingEmails(editingEmails.filter((_, i) => i !== index));
  };

  const handleAddPhone = () => {
    if (!newPhone.trim()) {
      Alert.alert('Error', 'Please enter a valid phone number');
      return;
    }
    if (editingPhones.includes(newPhone.trim())) {
      Alert.alert('Error', 'This phone number already exists');
      return;
    }
    setEditingPhones([...editingPhones, newPhone.trim()]);
    setNewPhone('');
  };

  const handleRemovePhone = (index: number) => {
    setEditingPhones(editingPhones.filter((_, i) => i !== index));
  };

  const handleAttachDocuments = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        multiple: true,
        type: '*/*',
      });

      if (!result.canceled && result.assets) {
        setSelectedDocuments(result.assets);
        Alert.alert('Files Selected', `${result.assets.length} file(s) selected`);
      }
    } catch (error) {
      console.error('Error picking documents:', error);
      Alert.alert('Error', 'Failed to pick documents.');
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !selectedLead || !token) {
      Alert.alert('Error', 'Please enter a comment');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('token', token);
      formData.append('lead_id', selectedLead.id.toString());
      formData.append('comment', newComment.trim());

      if (selectedDocuments && selectedDocuments.length > 0) {
        selectedDocuments.forEach((doc) => {
          formData.append('documents', {
            uri: doc.uri,
            type: doc.mimeType || 'application/octet-stream',
            name: doc.name,
          } as any);
        });
      }

      const response = await fetch(`${BACKEND_URL}/citadel_admin/addComment`, {
        method: 'POST',
        body: formData,
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();
      const newCommentObj = {
        id: data.lead_comment.comment.id.toString(),
        commentBy: data.lead_comment.comment.user.full_name,
        date: data.lead_comment.comment.created_at,
        phase: data.lead_comment.created_at_phase,
        subphase: data.lead_comment.created_at_subphase,
        content: data.lead_comment.comment.content,
        hasFile: data.lead_comment.comment.documents.length > 0,
        fileName: data.lead_comment.comment.documents.length > 0 
          ? data.lead_comment.comment.documents.map((doc: any) => doc.document_name).join(', ')
          : undefined,
        documents: data.lead_comment.comment.documents
      };

      setComments([newCommentObj, ...comments]);
      setNewComment('');
      setSelectedDocuments([]);
      Alert.alert('Success', 'Comment added successfully!');
    } catch (error) {
      console.error('Error adding comment:', error);
      Alert.alert('Error', 'Failed to add comment.');
    }
  };

  const fetchPotentialCollaborators = async (query: string) => {
    if (!query.trim() || !token) {
      setPotentialCollaborators([]);
      setShowPotentialCollaborators(false);
      return;
    }

    try {
      const response = await fetch(`${BACKEND_URL}/employee/getPotentialCollaborators?query=${encodeURIComponent(query)}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();
      setPotentialCollaborators(data.potential_collaborators);
      setShowPotentialCollaborators(data.potential_collaborators.length > 0);
    } catch (error) {
      console.error('Error fetching potential collaborators:', error);
      setPotentialCollaborators([]);
      setShowPotentialCollaborators(false);
    }
  };

  const handleCollaboratorInputChange = (text: string) => {
    setNewCollaborator(text);
    
    if (collaboratorSearchTimeout) {
      clearTimeout(collaboratorSearchTimeout);
    }
    
    if (!text.trim()) {
      setPotentialCollaborators([]);
      setShowPotentialCollaborators(false);
      return;
    }
    
    const timeout = setTimeout(() => {
      fetchPotentialCollaborators(text);
    }, 500);
    
    setCollaboratorSearchTimeout(timeout);
  };

  const handlePotentialCollaboratorSelect = (collaborator: PotentialCollaborator) => {
    setNewCollaborator(collaborator.email);
    setShowPotentialCollaborators(false);
    setPotentialCollaborators([]);
  };

  const handleAddCollaborator = async () => {
    if (!newCollaborator.trim() || !selectedLead || !token) {
      Alert.alert('Error', 'Please enter an email address');
      return;
    }
    
    try {
      const response = await fetch(`${BACKEND_URL}/citadel_admin/addCollaborators`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: token,
          lead_id: selectedLead.id,
          email: newCollaborator.trim()
        })
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      await fetchCollaborators(selectedLead.id);
      Alert.alert('Success', 'Collaborator added successfully!');
      setNewCollaborator('');
      setPotentialCollaborators([]);
      setShowPotentialCollaborators(false);
    } catch (error) {
      console.error('Error adding collaborator:', error);
      Alert.alert('Error', 'Failed to add collaborator.');
    }
  };

  const handleRemoveCollaborator = async (collaboratorId: number) => {
    if (!selectedLead || !token) return;

    try {
      const response = await fetch(`${BACKEND_URL}/citadel_admin/removeCollaborator`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: token,
          lead_id: selectedLead.id,
          collaborator_id: collaboratorId
        })
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      await fetchCollaborators(selectedLead.id);
      Alert.alert('Success', 'Collaborator removed successfully!');
    } catch (error) {
      console.error('Error removing collaborator:', error);
      Alert.alert('Error', 'Failed to remove collaborator.');
    }
  };

  const handlePhaseSelection = async (phase: string) => {
    if (!selectedLead) return;
    
    setSelectedLead({...selectedLead, phase: phase});
    await fetchSubphases(phase);
    
    if (allSubphases.length > 0) {
      setSelectedLead({...selectedLead, subphase: ''});
    }
  };

  const handleDefaultCommentSelect = (defaultComment: any) => {
    try {
      const commentText = JSON.parse(defaultComment.data);
      setNewComment(commentText);
      setShowDefaultComments(false);
    } catch {
      setNewComment(defaultComment.data);
      setShowDefaultComments(false);
    }
  };

  const handleRemoveDocument = (index: number) => {
    setSelectedDocuments(selectedDocuments.filter((_, i) => i !== index));
  };

  const handleLoadMoreComments = () => {
    if (commentsPagination && commentsPagination.has_next && !loadingMoreComments && selectedLead) {
      fetchComments(selectedLead.id, commentsPagination.current_page + 1, true);
    }
  };

  const handleCommentsScroll = (event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 20) {
      handleLoadMoreComments();
    }
  };

  const getFilterLabel = (filterKey: string, value: string): string => {
    let choices: any[] = [];
    switch (filterKey) {
      case 'status': choices = STATUS_CHOICES; break;
      case 'phase': choices = allPhases; break;
      case 'subphase': choices = allSubphases; break;
    }
    const option = choices.find(choice => choice.value === value);
    return option ? option.label : beautifyName(value);
  };

  return (
    <SafeAreaView style={[componentStyles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      <View style={componentStyles.header}>
        <TouchableOpacity style={componentStyles.backButton} onPress={onBack}>
          <BackIcon />
        </TouchableOpacity>
        <Text style={componentStyles.headerTitle}>Lead Details</Text>
        <View style={componentStyles.headerActions}>
          {!isEditMode ? (
            <TouchableOpacity style={componentStyles.editButton} onPress={() => setIsEditMode(true)}>
              <Text style={componentStyles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={componentStyles.saveButton} onPress={handleSave} disabled={loading}>
              {loading ? (
                <ActivityIndicator color={colors.white} size="small" />
              ) : (
                <Text style={componentStyles.saveButtonText}>Save</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView 
        style={componentStyles.detailScrollView} 
        showsVerticalScrollIndicator={false}
        onScroll={handleCommentsScroll}
        scrollEventThrottle={16}
      >
        {/* Lead Info Card */}
        <View style={componentStyles.detailCard}>
          <View style={componentStyles.leadHeader}>
            <View style={componentStyles.leadInfo}>
              <Text style={componentStyles.leadName}>{selectedLead.name}</Text>
              <View style={componentStyles.statusIndicatorRow}>
                <View style={[componentStyles.statusDot, { backgroundColor: getStatusColor(selectedLead.status) }]} />
                <Text style={componentStyles.statusText}>{beautifyName(selectedLead.status)}</Text>
              </View>
              <Text style={componentStyles.leadCompany}>{selectedLead.company || 'No company'}</Text>
              <Text style={componentStyles.leadDate}>Created: {formatDateTime(selectedLead.created_at || selectedLead.createdAt)}</Text>
              <Text style={componentStyles.leadDate}>Updated: {formatDateTime(selectedLead.updated_at)}</Text>
              <Text style={componentStyles.leadAssigned}>Assigned to: {selectedLead.assigned_to.full_name}</Text>
            </View>
          </View>
        </View>

        {/* Contact Info */}
        <View style={componentStyles.detailCard}>
          <Text style={componentStyles.sectionTitle}>Email Addresses ({editingEmails.length})</Text>
          
          {editingEmails.length > 0 ? (
            editingEmails.map((email, index) => (
              <View key={index} style={componentStyles.contactItemContainer}>
                <View style={componentStyles.contactItemContent}>
                  <Text style={componentStyles.contactItemText}>📧 {email}</Text>
                </View>
                {isEditMode && (
                  <TouchableOpacity 
                    style={componentStyles.removeContactButton}
                    onPress={() => handleRemoveEmail(index)}
                  >
                    <Text style={componentStyles.removeContactButtonText}>×</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))
          ) : (
            <View style={componentStyles.emptyContactContainer}>
              <Text style={componentStyles.emptyContactText}>No emails added</Text>
            </View>
          )}

          {isEditMode && (
            <View style={componentStyles.addContactContainer}>
              <TextInput
                style={[componentStyles.input, { flex: 1 }]}
                value={newEmail}
                onChangeText={setNewEmail}
                placeholder="Add email..."
                placeholderTextColor={colors.textSecondary}
                keyboardType="email-address"
              />
              <TouchableOpacity style={componentStyles.addButton} onPress={handleAddEmail}>
                <Text style={componentStyles.addButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={componentStyles.detailCard}>
          <Text style={componentStyles.sectionTitle}>Phone Numbers ({editingPhones.length})</Text>
          
          {editingPhones.length > 0 ? (
            editingPhones.map((phone, index) => (
              <View key={index} style={componentStyles.contactItemContainer}>
                <View style={componentStyles.contactItemContent}>
                  <Text style={componentStyles.contactItemText}>📱 {phone}</Text>
                </View>
                {isEditMode && (
                  <TouchableOpacity 
                    style={componentStyles.removeContactButton}
                    onPress={() => handleRemovePhone(index)}
                  >
                    <Text style={componentStyles.removeContactButtonText}>×</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))
          ) : (
            <View style={componentStyles.emptyContactContainer}>
              <Text style={componentStyles.emptyContactText}>No phone numbers added</Text>
            </View>
          )}

          {isEditMode && (
            <View style={componentStyles.addContactContainer}>
              <TextInput
                style={[componentStyles.input, { flex: 1 }]}
                value={newPhone}
                onChangeText={setNewPhone}
                placeholder="Add phone..."
                placeholderTextColor={colors.textSecondary}
                keyboardType="phone-pad"
              />
              <TouchableOpacity style={componentStyles.addButton} onPress={handleAddPhone}>
                <Text style={componentStyles.addButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Lead Management */}
        <View style={componentStyles.detailCard}>
          <Text style={componentStyles.sectionTitle}>Lead Management</Text>
          
          <View style={componentStyles.managementRow}>
            <View style={componentStyles.managementItem}>
              <Text style={componentStyles.inputLabel}>Status</Text>
              {isEditMode ? (
                <TouchableOpacity
                  style={componentStyles.dropdown}
                  onPress={() => setActiveDropdown('status')}
                >
                  <Text style={componentStyles.dropdownText}>
                    {getFilterLabel('status', selectedLead.status)}
                  </Text>
                  <Text style={componentStyles.dropdownArrow}>▼</Text>
                </TouchableOpacity>
              ) : (
                <View style={componentStyles.readOnlyField}>
                  <Text style={componentStyles.readOnlyText}>
                    {getFilterLabel('status', selectedLead.status)}
                  </Text>
                </View>
              )}
            </View>

            <View style={componentStyles.managementItem}>
              <Text style={componentStyles.inputLabel}>Phase</Text>
              {isEditMode ? (
                <TouchableOpacity
                  style={componentStyles.dropdown}
                  onPress={() => setActiveDropdown('phase')}
                >
                  <Text style={componentStyles.dropdownText}>
                    {getFilterLabel('phase', selectedLead.phase)}
                  </Text>
                  <Text style={componentStyles.dropdownArrow}>▼</Text>
                </TouchableOpacity>
              ) : (
                <View style={componentStyles.readOnlyField}>
                  <Text style={componentStyles.readOnlyText}>
                    {getFilterLabel('phase', selectedLead.phase)}
                  </Text>
                </View>
              )}
            </View>
          </View>

          <View style={componentStyles.inputGroup}>
            <Text style={componentStyles.inputLabel}>Subphase</Text>
            {isEditMode ? (
              <TouchableOpacity
                style={componentStyles.dropdown}
                onPress={() => setActiveDropdown('subphase')}
              >
                <Text style={componentStyles.dropdownText}>
                  {getFilterLabel('subphase', selectedLead.subphase)}
                </Text>
                <Text style={componentStyles.dropdownArrow}>▼</Text>
              </TouchableOpacity>
            ) : (
              <View style={componentStyles.readOnlyField}>
                <Text style={componentStyles.readOnlyText}>
                  {getFilterLabel('subphase', selectedLead.subphase)}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Collaborators */}
        <View style={componentStyles.detailCard}>
          <Text style={componentStyles.sectionTitle}>
            Collaborators ({collaborators.length})
          </Text>
          
          {loadingCollaborators ? (
            <View style={componentStyles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={componentStyles.loadingText}>Loading collaborators...</Text>
            </View>
          ) : collaborators.length > 0 ? (
            collaborators.map((collaborator) => (
              <View key={collaborator.id} style={componentStyles.collaboratorItem}>
                <View style={componentStyles.collaboratorInfo}>
                  <Text style={componentStyles.collaboratorName}>{collaborator.user.full_name}</Text>
                  <Text style={componentStyles.collaboratorEmail}>{collaborator.user.email}</Text>
                  <Text style={componentStyles.collaboratorRole}>
                    {collaborator.user.designation || collaborator.user.role}
                  </Text>
                </View>
                {isEditMode && (
                  <TouchableOpacity
                    style={componentStyles.removeButton}
                    onPress={() => {
                      Alert.alert(
                        'Remove Collaborator',
                        `Remove ${collaborator.user.full_name}?`,
                        [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Remove', style: 'destructive', onPress: () => handleRemoveCollaborator(collaborator.id) }
                        ]
                      );
                    }}
                  >
                    <Text style={componentStyles.removeButtonText}>×</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))
          ) : (
            <View style={componentStyles.emptyCollaborators}>
              <Text style={componentStyles.emptyCollaboratorsText}>No collaborators yet</Text>
            </View>
          )}
          
          {isEditMode && (
            <View style={componentStyles.addCollaboratorContainer}>
              <View style={{ flex: 1, position: 'relative' }}>
                <TextInput
                  style={[componentStyles.input, { flex: 1 }]}
                  value={newCollaborator}
                  onChangeText={handleCollaboratorInputChange}
                  placeholder="Enter collaborator email..."
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="email-address"
                />
                
                {showPotentialCollaborators && (
                  <View style={componentStyles.potentialCollaboratorsDropdown}>
                    {loadingPotentialCollaborators ? (
                      <View style={componentStyles.potentialCollaboratorLoadingItem}>
                        <ActivityIndicator size="small" color={colors.primary} />
                        <Text style={componentStyles.potentialCollaboratorLoadingText}>Searching...</Text>
                      </View>
                    ) : (
                      <ScrollView
                        style={componentStyles.potentialCollaboratorsList}
                        keyboardShouldPersistTaps="handled"
                        nestedScrollEnabled={true}
                      >
                        {potentialCollaborators.map((collaborator) => (
                          <TouchableOpacity
                            key={collaborator.employee_id}
                            style={componentStyles.potentialCollaboratorItem}
                            onPress={() => handlePotentialCollaboratorSelect(collaborator)}
                          >
                            <View style={componentStyles.potentialCollaboratorInfo}>
                              <Text style={componentStyles.potentialCollaboratorName}>
                                {collaborator.full_name}
                              </Text>
                              <Text style={componentStyles.potentialCollaboratorEmail}>
                                {collaborator.email}
                              </Text>
                              <Text style={componentStyles.potentialCollaboratorRole}>
                                {collaborator.designation || collaborator.role}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    )}
                  </View>
                )}
              </View>
              
              <TouchableOpacity style={componentStyles.addButton} onPress={handleAddCollaborator}>
                <Text style={componentStyles.addButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Comments */}
        <View style={componentStyles.detailCard}>
          <Text style={componentStyles.sectionTitle}>
            Comments ({comments.length}
            {commentsPagination && ` of ${commentsPagination.total_items}`})
          </Text>
          
          {loadingComments ? (
            <View style={componentStyles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={componentStyles.loadingText}>Loading comments...</Text>
            </View>
          ) : comments.length > 0 ? (
            <>
              {comments.map((comment) => (
                <View key={comment.id} style={componentStyles.commentItem}>
                  <View style={componentStyles.commentHeaderRow}>
                    <View style={componentStyles.commentMetaItem}>
                      <Text style={componentStyles.commentLabel}>Comment By:</Text>
                      <Text style={componentStyles.commentValue}>{comment.commentBy}</Text>
                    </View>
                    <View style={componentStyles.commentMetaItem}>
                      <Text style={componentStyles.commentLabel}>Date:</Text>
                      <Text style={componentStyles.commentValue}>{formatDateTime(comment.date)}</Text>
                    </View>
                  </View>
                  <View style={componentStyles.commentHeaderRow}>
                    <View style={componentStyles.commentMetaItem}>
                      <Text style={componentStyles.commentLabel}>Phase:</Text>
                      <Text style={componentStyles.commentValue}>{beautifyName(comment.phase)}</Text>
                    </View>
                    <View style={componentStyles.commentMetaItem}>
                      <Text style={componentStyles.commentLabel}>Subphase:</Text>
                      <Text style={componentStyles.commentValue}>{beautifyName(comment.subphase)}</Text>
                    </View>
                  </View>
                  <View style={componentStyles.commentContentRow}>
                    <Text style={componentStyles.commentLabel}>Content:</Text>
                    <Text style={componentStyles.commentContentText}>{comment.content}</Text>
                  </View>
                  {comment.documents && comment.documents.length > 0 && (
                    <View style={componentStyles.documentsContainer}>
                      <Text style={componentStyles.documentsLabel}>Attachments:</Text>
                      {comment.documents.map((doc) => (
                        <TouchableOpacity key={doc.id} style={componentStyles.fileButton}>
                          <Text style={componentStyles.fileButtonText}>📎 {doc.document_name}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              ))}

              {loadingMoreComments && (
                <View style={componentStyles.loadMoreContainer}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={componentStyles.loadMoreText}>Loading more comments...</Text>
                </View>
              )}

              {commentsPagination && !commentsPagination.has_next && comments.length > 0 && (
                <View style={componentStyles.endOfListContainer}>
                  <Text style={componentStyles.endOfListText}>
                    You've reached the end of the comments
                  </Text>
                </View>
              )}
            </>
          ) : (
            <View style={componentStyles.emptyComments}>
              <Text style={componentStyles.emptyCommentsText}>No comments yet</Text>
              <Text style={componentStyles.emptyCommentsSubtext}>Start the conversation by adding a comment below</Text>
            </View>
          )}

          {/* Add Comment Section */}
          <View style={componentStyles.addCommentSection}>
            <View style={componentStyles.commentActions}>
              <TouchableOpacity
                style={componentStyles.actionButton}
                onPress={() => setShowDefaultComments(true)}
                disabled={loadingDefaultComments}
              >
                {loadingDefaultComments ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Text style={componentStyles.actionButtonText}>Default Comments</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity 
                style={componentStyles.actionButton} 
                onPress={handleAttachDocuments}
              >
                <Text style={componentStyles.actionButtonText}>📎 Attach ({selectedDocuments.length})</Text>
              </TouchableOpacity>
            </View>

            {selectedDocuments.length > 0 && (
              <View style={componentStyles.selectedDocumentsContainer}>
                <Text style={componentStyles.selectedDocumentsTitle}>Selected Files:</Text>
                {selectedDocuments.map((doc, index) => (
                  <View key={index} style={componentStyles.selectedDocumentItem}>
                    <Text style={componentStyles.selectedDocumentName} numberOfLines={1}>
                      📎 {doc.name}
                    </Text>
                    <TouchableOpacity 
                      style={componentStyles.removeDocumentButton}
                      onPress={() => handleRemoveDocument(index)}
                    >
                      <Text style={componentStyles.removeDocumentButtonText}>×</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            <TextInput
              style={componentStyles.commentInput}
              value={newComment}
              onChangeText={setNewComment}
              placeholder="Add your comment here..."
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              placeholderTextColor={colors.textSecondary}
            />

            <TouchableOpacity 
              style={[componentStyles.submitButton, addingComment && componentStyles.submitButtonDisabled]} 
              onPress={handleAddComment}
              disabled={addingComment}
            >
              {addingComment ? (
                <ActivityIndicator color={colors.white} size="small" />
              ) : (
                <Text style={componentStyles.submitButtonText}>Add Comment</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Dropdown Modals */}
      <DropdownModal
        visible={activeDropdown === 'status'}
        onClose={() => setActiveDropdown(null)}
        options={STATUS_CHOICES}
        onSelect={(value) => setSelectedLead({...selectedLead, status: value as any})}
        title="Select Status"
      />
      <DropdownModal
        visible={activeDropdown === 'phase'}
        onClose={() => setActiveDropdown(null)}
        options={allPhases}
        onSelect={handlePhaseSelection}
        title="Select Phase"
      />
      <DropdownModal
        visible={activeDropdown === 'subphase'}
        onClose={() => setActiveDropdown(null)}
        options={allSubphases}
        onSelect={(value) => setSelectedLead({...selectedLead, subphase: value})}
        title="Select Subphase"
      />

      {/* Default Comments Modal */}
      <Modal visible={showDefaultComments} transparent animationType="fade" onRequestClose={() => setShowDefaultComments(false)}>
        <TouchableOpacity style={componentStyles.modalOverlay} activeOpacity={1} onPress={() => setShowDefaultComments(false)}>
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <View style={componentStyles.defaultCommentsModal}>
              <Text style={componentStyles.modalTitle}>
                Default Comments - {beautifyName(selectedLead.phase)} → {beautifyName(selectedLead.subphase)}
              </Text>
              <ScrollView style={componentStyles.defaultCommentsList}>
                {loadingDefaultComments ? (
                  <View style={componentStyles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={componentStyles.loadingText}>Loading default comments...</Text>
                  </View>
                ) : defaultComments.length > 0 ? (
                  defaultComments.map((comment) => (
                    <TouchableOpacity
                      key={comment.id}
                      style={componentStyles.defaultCommentItem}
                      onPress={() => handleDefaultCommentSelect(comment)}
                    >
                      <Text style={componentStyles.defaultCommentText}>
                        {(() => {
                          try {
                            return JSON.parse(comment.data);
                          } catch {
                            return comment.data;
                          }
                        })()}
                      </Text>
                    </TouchableOpacity>
                  ))
                ) : (
                  <View style={componentStyles.emptyState}>
                    <Text style={componentStyles.emptyStateText}>
                      No default comments available for this phase/subphase
                    </Text>
                  </View>
                )}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

export const CreateLeadView: React.FC<CreateLeadViewProps> = ({
  insets, onBack, allPhases, allSubphases, newLeadName, setNewLeadName,
  newLeadCompany, setNewLeadCompany, newLeadEmails, setNewLeadEmails,
  newLeadPhones, setNewLeadPhones, newLeadStatus, setNewLeadStatus,
  newLeadPhase, setNewLeadPhase, newLeadSubphase, setNewLeadSubphase,
  newLeadAssignedTo, setNewLeadAssignedTo, newEmailInput, setNewEmailInput,
  newPhoneInput, setNewPhoneInput, potentialBDTs, setPotentialBDTs,
  creatingLead, activeDropdown, setActiveDropdown, token,
  fetchSubphases, fetchLeads, setViewMode
}) => {

  const [bdtSearchTimeout, setBdtSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const [showPotentialBDTs, setShowPotentialBDTs] = useState(false);
  const [loadingPotentialBDTs, setLoadingPotentialBDTs] = useState(false);

  const fetchPotentialBDTs = async (query: string) => {
    if (!query.trim() || !token) {
      setPotentialBDTs([]);
      setShowPotentialBDTs(false);
      return;
    }

    try {
      setLoadingPotentialBDTs(true);

      const response = await fetch(`${BACKEND_URL}/employee/getPotentialCollaborators?query=${encodeURIComponent(query)}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();
      setPotentialBDTs(data.potential_collaborators);
      setShowPotentialBDTs(data.potential_collaborators.length > 0);
    } catch (error) {
      console.error('Error fetching potential BDTs:', error);
      setPotentialBDTs([]);
      setShowPotentialBDTs(false);
    } finally {
      setLoadingPotentialBDTs(false);
    }
  };

  const handleBDTInputChange = (text: string) => {
    setNewLeadAssignedTo(text);
    
    if (bdtSearchTimeout) {
      clearTimeout(bdtSearchTimeout);
    }
    
    if (!text.trim()) {
      setPotentialBDTs([]);
      setShowPotentialBDTs(false);
      return;
    }
    
    const timeout = setTimeout(() => {
      fetchPotentialBDTs(text);
    }, 500);
    
    setBdtSearchTimeout(timeout);
  };

  const handlePotentialBDTSelect = (bdt: PotentialCollaborator) => {
    setNewLeadAssignedTo(bdt.email);
    setShowPotentialBDTs(false);
    setPotentialBDTs([]);
  };

  const handleAddEmail = () => {
    if (!newEmailInput.trim()) {
      Alert.alert('Error', 'Please enter a valid email');
      return;
    }
    if (newLeadEmails.includes(newEmailInput.trim())) {
      Alert.alert('Error', 'This email already exists');
      return;
    }
    setNewLeadEmails([...newLeadEmails, newEmailInput.trim()]);
    setNewEmailInput('');
  };

  const handleRemoveEmail = (index: number) => {
    setNewLeadEmails(newLeadEmails.filter((_, i) => i !== index));
  };

  const handleAddPhone = () => {
    if (!newPhoneInput.trim()) {
      Alert.alert('Error', 'Please enter a valid phone number');
      return;
    }
    if (newLeadPhones.includes(newPhoneInput.trim())) {
      Alert.alert('Error', 'This phone number already exists');
      return;
    }
    setNewLeadPhones([...newLeadPhones, newPhoneInput.trim()]);
    setNewPhoneInput('');
  };

  const handleRemovePhone = (index: number) => {
    setNewLeadPhones(newLeadPhones.filter((_, i) => i !== index));
  };

  const createLead = async () => {
    if (!newLeadName.trim() || !newLeadAssignedTo.trim()) {
      Alert.alert('Error', 'Please enter lead name and assign to a BDT');
      return;
    }

    try {
      if (!token) return;

      const createResponse = await fetch(`${BACKEND_URL}/citadel_admin/createLead`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: token,
          name: newLeadName,
          assigned_to: newLeadAssignedTo
        })
      });

      if (!createResponse.ok) throw new Error(`HTTP error! status: ${createResponse.status}`);

      const createData = await createResponse.json();
      
      if (createData.message !== 'Lead created successfully') {
        throw new Error(createData.message);
      }

      const leadId = createData.lead.id;

      const updatePayload: any = {
        token: token,
        lead_id: leadId
      };

      if (newLeadEmails.length > 0) updatePayload.emails = newLeadEmails;
      if (newLeadPhones.length > 0) updatePayload.phone_numbers = newLeadPhones;
      if (newLeadCompany) updatePayload.company = newLeadCompany;
      if (newLeadStatus) updatePayload.status = newLeadStatus;
      if (newLeadPhase) updatePayload.phase = newLeadPhase;
      if (newLeadSubphase) updatePayload.subphase = newLeadSubphase;

      await fetch(`${BACKEND_URL}/citadel_admin/updateLead`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload)
      });

      Alert.alert('Success', 'Lead created successfully!');
      
      setNewLeadName('');
      setNewLeadCompany('');
      setNewLeadEmails([]);
      setNewLeadPhones([]);
      setNewLeadStatus('active');
      setNewLeadPhase('');
      setNewLeadSubphase('');
      setNewLeadAssignedTo('');
      setNewEmailInput('');
      setNewPhoneInput('');
      
      fetchLeads(1);
      setViewMode('list');
    } catch (error) {
      console.error('Error creating lead:', error);
      Alert.alert('Error', 'Failed to create lead.');
    }
  };

  return (
    <SafeAreaView style={[componentStyles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      <View style={componentStyles.header}>
        <TouchableOpacity style={componentStyles.backButton} onPress={onBack}>
          <BackIcon />
        </TouchableOpacity>
        <Text style={componentStyles.headerTitle}>Create Lead</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={componentStyles.detailScrollView} showsVerticalScrollIndicator={false}>
        {/* Basic Information */}
        <View style={componentStyles.detailCard}>
          <Text style={componentStyles.sectionTitle}>Basic Information</Text>
          
          <View style={componentStyles.inputGroup}>
            <Text style={componentStyles.inputLabel}>Lead Name *</Text>
            <TextInput
              style={componentStyles.input}
              value={newLeadName}
              onChangeText={setNewLeadName}
              placeholder="Enter lead name"
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <View style={componentStyles.inputGroup}>
            <Text style={componentStyles.inputLabel}>Company Name</Text>
            <TextInput
              style={componentStyles.input}
              value={newLeadCompany}
              onChangeText={setNewLeadCompany}
              placeholder="Enter company name"
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <View style={componentStyles.inputGroup}>
            <Text style={componentStyles.inputLabel}>Assign to BDT *</Text>
            <View style={{ position: 'relative' }}>
              <TextInput
                style={componentStyles.input}
                value={newLeadAssignedTo}
                onChangeText={handleBDTInputChange}
                placeholder="Enter BDT email"
                placeholderTextColor={colors.textSecondary}
                keyboardType="email-address"
              />
              
              {showPotentialBDTs && (
                <View style={componentStyles.potentialCollaboratorsDropdown}>
                  {loadingPotentialBDTs ? (
                    <View style={componentStyles.potentialCollaboratorLoadingItem}>
                      <ActivityIndicator size="small" color={colors.primary} />
                      <Text style={componentStyles.potentialCollaboratorLoadingText}>Searching...</Text>
                    </View>
                  ) : (
                    <ScrollView
                      style={componentStyles.potentialCollaboratorsList}
                      keyboardShouldPersistTaps="handled"
                      nestedScrollEnabled={true}
                    >
                      {potentialBDTs.map((bdt) => (
                        <TouchableOpacity
                          key={bdt.employee_id}
                          style={componentStyles.potentialCollaboratorItem}
                          onPress={() => handlePotentialBDTSelect(bdt)}
                        >
                          <View style={componentStyles.potentialCollaboratorInfo}>
                            <Text style={componentStyles.potentialCollaboratorName}>
                              {bdt.full_name}
                            </Text>
                            <Text style={componentStyles.potentialCollaboratorEmail}>
                              {bdt.email}
                            </Text>
                            <Text style={componentStyles.potentialCollaboratorRole}>
                              {bdt.designation || bdt.role}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Contact Information */}
        <View style={componentStyles.detailCard}>
          <Text style={componentStyles.sectionTitle}>Contact Information</Text>
          
          <View style={componentStyles.inputGroup}>
            <Text style={componentStyles.inputLabel}>Email Addresses ({newLeadEmails.length})</Text>
            {newLeadEmails.map((email, index) => (
              <View key={index} style={componentStyles.contactItemContainer}>
                <View style={componentStyles.contactItemContent}>
                  <Text style={componentStyles.contactItemText}>📧 {email}</Text>
                </View>
                <TouchableOpacity 
                  style={componentStyles.removeContactButton}
                  onPress={() => handleRemoveEmail(index)}
                >
                  <Text style={componentStyles.removeContactButtonText}>×</Text>
                </TouchableOpacity>
              </View>
            ))}
            <View style={componentStyles.addContactContainer}>
              <TextInput
                style={[componentStyles.input, { flex: 1, marginBottom: 0 }]}
                value={newEmailInput}
                onChangeText={setNewEmailInput}
                placeholder="Add email..."
                placeholderTextColor={colors.textSecondary}
                keyboardType="email-address"
              />
              <TouchableOpacity style={componentStyles.addButton} onPress={handleAddEmail}>
                <Text style={componentStyles.addButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={componentStyles.inputGroup}>
            <Text style={componentStyles.inputLabel}>Phone Numbers ({newLeadPhones.length})</Text>
            {newLeadPhones.map((phone, index) => (
              <View key={index} style={componentStyles.contactItemContainer}>
                <View style={componentStyles.contactItemContent}>
                  <Text style={componentStyles.contactItemText}>📱 {phone}</Text>
                </View>
                <TouchableOpacity 
                  style={componentStyles.removeContactButton}
                  onPress={() => handleRemovePhone(index)}
                >
                  <Text style={componentStyles.removeContactButtonText}>×</Text>
                </TouchableOpacity>
              </View>
            ))}
            <View style={componentStyles.addContactContainer}>
              <TextInput
                style={[componentStyles.input, { flex: 1, marginBottom: 0 }]}
                value={newPhoneInput}
                onChangeText={setNewPhoneInput}
                placeholder="Add phone..."
                placeholderTextColor={colors.textSecondary}
                keyboardType="phone-pad"
              />
              <TouchableOpacity style={componentStyles.addButton} onPress={handleAddPhone}>
                <Text style={componentStyles.addButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Lead Details */}
        <View style={componentStyles.detailCard}>
          <Text style={componentStyles.sectionTitle}>Lead Details</Text>
          
          <View style={componentStyles.inputGroup}>
            <Text style={componentStyles.inputLabel}>Status</Text>
            <TouchableOpacity
              style={componentStyles.dropdown}
              onPress={() => setActiveDropdown('status')}
            >
              <Text style={componentStyles.dropdownText}>
                {beautifyName(newLeadStatus)}
              </Text>
              <Text style={componentStyles.dropdownArrow}>▼</Text>
            </TouchableOpacity>
          </View>

          <View style={componentStyles.inputGroup}>
            <Text style={componentStyles.inputLabel}>Phase</Text>
            <TouchableOpacity
              style={componentStyles.dropdown}
              onPress={() => setActiveDropdown('phase')}
            >
              <Text style={componentStyles.dropdownText}>
                {newLeadPhase ? beautifyName(newLeadPhase) : 'Select Phase'}
              </Text>
              <Text style={componentStyles.dropdownArrow}>▼</Text>
            </TouchableOpacity>
          </View>

          <View style={componentStyles.inputGroup}>
            <Text style={componentStyles.inputLabel}>Subphase</Text>
            <TouchableOpacity
              style={[componentStyles.dropdown, !newLeadPhase && { opacity: 0.5 }]}
              onPress={() => newLeadPhase && setActiveDropdown('subphase')}
              disabled={!newLeadPhase}
            >
              <Text style={componentStyles.dropdownText}>
                {newLeadSubphase ? beautifyName(newLeadSubphase) : 'Select Subphase'}
              </Text>
              <Text style={componentStyles.dropdownArrow}>▼</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity 
          style={[componentStyles.createLeadButton, creatingLead && { opacity: 0.6 }]}
          onPress={createLead}
          disabled={creatingLead}
        >
          {creatingLead ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={componentStyles.createLeadButtonText}>Create Lead</Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Dropdown Modals */}
      <DropdownModal
        visible={activeDropdown === 'status'}
        onClose={() => setActiveDropdown(null)}
        options={STATUS_CHOICES}
        onSelect={(value) => {
          setNewLeadStatus(value);
          setActiveDropdown(null);
        }}
        title="Select Status"
      />
      <DropdownModal
        visible={activeDropdown === 'phase'}
        onClose={() => setActiveDropdown(null)}
        options={allPhases}
        onSelect={(phase) => {
          setNewLeadPhase(phase);
          fetchSubphases(phase);
          setActiveDropdown(null);
        }}
        title="Select Phase"
      />
      <DropdownModal
        visible={activeDropdown === 'subphase'}
        onClose={() => setActiveDropdown(null)}
        options={allSubphases}
        onSelect={(value) => {
          setNewLeadSubphase(value);
          setActiveDropdown(null);
        }}
        title="Select Subphase"
      />
    </SafeAreaView>
  );
};

export const DefaultCommentsView: React.FC<DefaultCommentsViewProps> = ({
  insets, onBack, allPhases, allSubphases, allDefaultComments, setAllDefaultComments,
  selectedDefaultCommentPhase, setSelectedDefaultCommentPhase,
  selectedDefaultCommentSubphase, setSelectedDefaultCommentSubphase,
  newDefaultCommentText, setNewDefaultCommentText,
  addingDefaultComment, loading, activeDropdown, setActiveDropdown,
  token, fetchSubphases
}) => {

  const addDefaultComment = async () => {
    if (!selectedDefaultCommentPhase || !selectedDefaultCommentSubphase || !newDefaultCommentText.trim()) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    try {
      if (!token) return;

      const response = await fetch(`${BACKEND_URL}/citadel_admin/addDefaultComments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: token,
          at_phase: selectedDefaultCommentPhase,
          at_subphase: selectedDefaultCommentSubphase,
          data: newDefaultCommentText
        })
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      Alert.alert('Success', 'Default comment added!');
      setNewDefaultCommentText('');
      setSelectedDefaultCommentPhase('');
      setSelectedDefaultCommentSubphase('');
    } catch (error) {
      console.error('Error adding default comment:', error);
      Alert.alert('Error', 'Failed to add default comment.');
    }
  };

  const deleteDefaultComment = async (commentId: number) => {
    try {
      if (!token) return;

      const response = await fetch(`${BACKEND_URL}/citadel_admin/deleteDefaultComment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: token,
          default_comment_id: commentId
        })
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      Alert.alert('Success', 'Default comment deleted!');
      setAllDefaultComments(allDefaultComments.filter(c => c.id !== commentId));
    } catch (error) {
      console.error('Error deleting default comment:', error);
      Alert.alert('Error', 'Failed to delete default comment.');
    }
  };

  return (
    <SafeAreaView style={[componentStyles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      <View style={componentStyles.header}>
        <TouchableOpacity style={componentStyles.backButton} onPress={onBack}>
          <BackIcon />
        </TouchableOpacity>
        <Text style={componentStyles.headerTitle}>Default Comments</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={componentStyles.detailScrollView} showsVerticalScrollIndicator={false}>
        <View style={componentStyles.detailCard}>
          <Text style={componentStyles.sectionTitle}>Add New Comment</Text>
          
          <View style={componentStyles.inputGroup}>
            <Text style={componentStyles.inputLabel}>Phase</Text>
            <TouchableOpacity
              style={componentStyles.dropdown}
              onPress={() => setActiveDropdown('phase')}
            >
              <Text style={componentStyles.dropdownText}>
                {selectedDefaultCommentPhase ? beautifyName(selectedDefaultCommentPhase) : 'Select Phase'}
              </Text>
              <Text style={componentStyles.dropdownArrow}>▼</Text>
            </TouchableOpacity>
          </View>

          <View style={componentStyles.inputGroup}>
            <Text style={componentStyles.inputLabel}>Subphase</Text>
            <TouchableOpacity
              style={[componentStyles.dropdown, !selectedDefaultCommentPhase && { opacity: 0.5 }]}
              onPress={() => selectedDefaultCommentPhase && setActiveDropdown('subphase')}
              disabled={!selectedDefaultCommentPhase}
            >
              <Text style={componentStyles.dropdownText}>
                {selectedDefaultCommentSubphase ? beautifyName(selectedDefaultCommentSubphase) : 'Select Subphase'}
              </Text>
              <Text style={componentStyles.dropdownArrow}>▼</Text>
            </TouchableOpacity>
          </View>

          <View style={componentStyles.inputGroup}>
            <Text style={componentStyles.inputLabel}>Comment Text</Text>
            <TextInput
              style={[componentStyles.input, { minHeight: 100, textAlignVertical: 'top' }]}
              value={newDefaultCommentText}
              onChangeText={setNewDefaultCommentText}
              placeholder="Enter comment text..."
              multiline
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <TouchableOpacity 
            style={[componentStyles.createLeadButton, addingDefaultComment && { opacity: 0.6 }]}
            onPress={addDefaultComment}
            disabled={addingDefaultComment}
          >
            {addingDefaultComment ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={componentStyles.createLeadButtonText}>Add Comment</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={componentStyles.detailCard}>
          <Text style={componentStyles.sectionTitle}>Existing Comments</Text>
          
          {loading ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.lg }} />
          ) : allDefaultComments.length > 0 ? (
            allDefaultComments.map((comment) => (
              <View key={comment.id} style={componentStyles.defaultCommentCard}>
                <View style={componentStyles.defaultCommentHeader}>
                  <Text style={componentStyles.defaultCommentPhase}>
                    {beautifyName(comment.at_phase)} → {beautifyName(comment.at_subphase)}
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      Alert.alert(
                        'Delete Comment',
                        'Are you sure?',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Delete', style: 'destructive', onPress: () => deleteDefaultComment(comment.id) }
                        ]
                      );
                    }}
                  >
                    <Text style={componentStyles.deleteButtonText}>🗑️</Text>
                  </TouchableOpacity>
                </View>
                <Text style={componentStyles.defaultCommentContent}>
                  {(() => {
                    try {
                      return JSON.parse(comment.data);
                    } catch {
                      return comment.data;
                    }
                  })()}
                </Text>
              </View>
            ))
          ) : (
            <Text style={componentStyles.emptyText}>No default comments yet</Text>
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <DropdownModal
        visible={activeDropdown === 'phase'}
        onClose={() => setActiveDropdown(null)}
        options={allPhases}
        onSelect={(phase) => {
          setSelectedDefaultCommentPhase(phase);
          fetchSubphases(phase);
          setTimeout(() => setActiveDropdown(null), 100);
        }}
        title="Select Phase"
      />
      <DropdownModal
        visible={activeDropdown === 'subphase'}
        onClose={() => setActiveDropdown(null)}
        options={allSubphases}
        onSelect={(value) => {
          setSelectedDefaultCommentSubphase(value);
          setActiveDropdown(null);
        }}
        title="Select Subphase"
      />
    </SafeAreaView>
  );
};

const componentStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.primary },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md, backgroundColor: colors.primary,
  },
  backButton: { padding: spacing.sm },
  backIcon: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  backArrow: {
    width: 12, height: 12, borderLeftWidth: 2, borderTopWidth: 2,
    borderColor: colors.white, transform: [{ rotate: '-45deg' }],
  },
  headerTitle: {
    fontSize: fontSize.xl, fontWeight: '600', color: colors.white, flex: 1, marginLeft: spacing.md,
  },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
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

  leadCard: {
    backgroundColor: colors.white,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.md,
  },
  leadCardHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'flex-start', 
    marginBottom: spacing.sm 
  },
  leadCardInfo: { flex: 1, marginRight: spacing.sm },
  leadCardName: { 
    fontSize: fontSize.md, 
    fontWeight: '600', 
    color: colors.text, 
    marginBottom: spacing.xs 
  },
  leadCardStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  leadStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.xs,
  },
  leadCardStatusText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  leadCardCompany: { 
    fontSize: fontSize.sm, 
    color: colors.textSecondary, 
    fontWeight: '500',
    marginBottom: spacing.sm,
  },
  leadCardContact: { 
    fontSize: fontSize.sm, 
    color: colors.textSecondary, 
    marginBottom: spacing.sm 
  },
  leadCardMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  leadCardPhase: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: '500',
    flex: 1,
  },
  leadCardAssigned: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  leadCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leadCardDateContainer: {
    alignItems: 'flex-start',
  },
  leadCardDate: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  leadCardTime: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  collaboratorBadge: {
    backgroundColor: colors.info + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  collaboratorBadgeText: {
    fontSize: fontSize.xs,
    color: colors.info,
    fontWeight: '500',
  },

  detailScrollView: { flex: 1, backgroundColor: colors.backgroundSecondary },
  detailCard: {
    backgroundColor: colors.white, marginHorizontal: spacing.lg, marginBottom: spacing.lg,
    padding: spacing.lg, borderRadius: borderRadius.xl, ...shadows.md,
  },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: '600', color: colors.text, marginBottom: spacing.md },

  leadHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'flex-start', 
    marginBottom: spacing.md 
  },
  leadInfo: { flex: 1 },
  leadName: { 
    fontSize: fontSize.xxl, 
    fontWeight: '700', 
    color: colors.text,
    marginBottom: spacing.sm,
  },
  statusIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: spacing.sm,
  },
  statusText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
  },
  leadCompany: { 
    fontSize: fontSize.md, 
    color: colors.textSecondary, 
    fontWeight: '500', 
    marginBottom: spacing.sm 
  },
  leadDate: { fontSize: fontSize.sm, color: colors.textLight, marginBottom: spacing.xs },
  leadAssigned: { 
    fontSize: fontSize.sm, 
    color: colors.info, 
    fontWeight: '500',
    marginTop: spacing.xs,
  },

  contactItemContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.info,
  },
  contactItemContent: { flex: 1 },
  contactItemText: {
    fontSize: fontSize.md,
    color: colors.text,
    fontWeight: '500',
  },
  removeContactButton: {
    backgroundColor: colors.error,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  removeContactButtonText: {
    color: colors.white,
    fontSize: fontSize.lg,
    fontWeight: 'bold',
  },
  addContactContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-end',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  emptyContactContainer: {
    paddingVertical: spacing.md,
    alignItems: 'center',
    backgroundColor: colors.gray + '20',
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  emptyContactText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md, fontSize: fontSize.md,
    color: colors.text, backgroundColor: colors.white, ...shadows.sm,
    marginBottom: spacing.md,
  },
  addButton: {
    backgroundColor: colors.primary, width: 40, height: 40, borderRadius: borderRadius.lg,
    alignItems: 'center', justifyContent: 'center', ...shadows.sm,
  },
  addButtonText: { color: colors.white, fontSize: fontSize.lg, fontWeight: '600' },

  inputGroup: { marginBottom: spacing.md },
  inputLabel: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text, marginBottom: spacing.sm },
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
  collaboratorInfo: { flex: 1 },
  collaboratorName: { fontSize: fontSize.md, color: colors.text, fontWeight: '500' },
  collaboratorEmail: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  collaboratorRole: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
    fontStyle: 'italic',
  },
  removeButton: {
    backgroundColor: colors.error, width: 24, height: 24, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  removeButtonText: { color: colors.white, fontSize: fontSize.lg, fontWeight: '600' },
  addCollaboratorContainer: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-end' },
  emptyCollaborators: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyCollaboratorsText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
  },

  potentialCollaboratorsDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: colors.white,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    maxHeight: 200,
    zIndex: 1000,
    ...shadows.md,
  },
  potentialCollaboratorsList: { maxHeight: 200 },
  potentialCollaboratorItem: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  potentialCollaboratorInfo: { flex: 1 },
  potentialCollaboratorName: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  potentialCollaboratorEmail: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  potentialCollaboratorRole: {
    fontSize: fontSize.xs,
    color: colors.primary,
    fontWeight: '500',
  },
  potentialCollaboratorLoadingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  potentialCollaboratorLoadingText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },

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
  documentsContainer: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  documentsLabel: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  fileButton: { 
    backgroundColor: colors.info + '20', 
    paddingHorizontal: spacing.sm, 
    paddingVertical: spacing.sm, 
    borderRadius: borderRadius.sm, 
    alignSelf: 'flex-start', 
    marginTop: spacing.xs 
  },
  fileButtonText: { fontSize: fontSize.sm, color: colors.info, fontWeight: '500' },
  emptyComments: { alignItems: 'center', paddingVertical: spacing.xl },
  emptyCommentsText: { 
    fontSize: fontSize.lg, 
    fontWeight: '600', 
    color: colors.textSecondary, 
    marginBottom: spacing.sm 
  },
  emptyCommentsSubtext: { 
    fontSize: fontSize.sm, 
    color: colors.textLight, 
    textAlign: 'center' 
  },

  addCommentSection: { 
    marginTop: spacing.lg, 
    paddingTop: spacing.lg, 
    borderTopWidth: 1, 
    borderTopColor: colors.border 
  },
  commentActions: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  actionButton: {
    flex: 1, paddingVertical: spacing.md, paddingHorizontal: spacing.md, borderWidth: 1,
    borderColor: colors.primary, borderRadius: borderRadius.lg, alignItems: 'center',
    backgroundColor: colors.primary + '10',
  },
  actionButtonText: { fontSize: fontSize.sm, color: colors.primary, fontWeight: '600' },
  selectedDocumentsContainer: {
    marginBottom: spacing.md,
    padding: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectedDocumentsTitle: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  selectedDocumentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.xs,
  },
  selectedDocumentName: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.primary,
  },
  removeDocumentButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeDocumentButtonText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: 'bold',
  },
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
  submitButtonDisabled: {
    backgroundColor: colors.textSecondary,
    opacity: 0.6,
  },

  loadingContainer: { alignItems: 'center', paddingVertical: spacing.xl },
  loadingText: { marginTop: spacing.sm, color: colors.textSecondary, fontSize: fontSize.sm },
  loadMoreContainer: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.lg,
  },
  loadMoreText: { marginLeft: spacing.sm, color: colors.textSecondary },
  endOfListContainer: { alignItems: 'center', paddingVertical: spacing.lg },
  endOfListText: { color: colors.textSecondary, fontStyle: 'italic' },

  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0, 0, 0, 0.5)', 
    justifyContent: 'center', 
    paddingHorizontal: spacing.xl 
  },
  dropdownContainer: {
    backgroundColor: colors.white, 
    borderRadius: borderRadius.xl, 
    maxHeight: screenHeight * 0.6, 
    ...shadows.lg,
  },
  dropdownTitle: {
    fontSize: fontSize.lg, fontWeight: '600', color: colors.text, textAlign: 'center',
    padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  searchContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.sm,
    color: colors.text,
  },
  dropdownList: { maxHeight: screenHeight * 0.4 },
  dropdownItem: { 
    paddingHorizontal: spacing.md, 
    paddingVertical: spacing.md, 
    borderBottomWidth: 1, 
    borderBottomColor: colors.border 
  },
  dropdownItemText: { fontSize: fontSize.md, color: colors.text, fontWeight: '500' },
  emptyDropdown: { padding: spacing.xl, alignItems: 'center' },
  emptyDropdownText: { fontSize: fontSize.md, color: colors.textSecondary, textAlign: 'center' },

  defaultCommentsModal: { 
    backgroundColor: colors.white, 
    borderRadius: borderRadius.xl, 
    maxHeight: screenHeight * 0.6, 
    ...shadows.lg 
  },
  modalTitle: {
    fontSize: fontSize.lg, fontWeight: '600', color: colors.text, textAlign: 'center',
    padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  defaultCommentsList: { maxHeight: screenHeight * 0.4, padding: spacing.sm },
  defaultCommentItem: { 
    paddingHorizontal: spacing.md, 
    paddingVertical: spacing.md, 
    borderBottomWidth: 1, 
    borderBottomColor: colors.border 
  },
  defaultCommentText: { fontSize: fontSize.md, color: colors.text },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyStateText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
  },

  defaultCommentCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  defaultCommentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  defaultCommentPhase: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.primary,
    flex: 1,
  },
  deleteButtonText: {
    fontSize: fontSize.lg,
  },
  defaultCommentContent: {
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 20,
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },

  createLeadButton: {
    backgroundColor: colors.success,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginVertical: spacing.lg,
    ...shadows.md,
  },
  createLeadButtonText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
});