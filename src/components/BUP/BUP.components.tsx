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
  CreateLeadViewProps, DefaultCommentsViewProps, FilterOption
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
          <Text style={componentStyles.leadCardCompany} numberOfLines={1}>
            {lead.company || 'No company'}
          </Text>
        </View>
        <View style={[componentStyles.statusBadge, { backgroundColor: getStatusColor(lead.status) + '20' }]}>
          <Text style={[componentStyles.statusBadgeText, { color: getStatusColor(lead.status) }]}>
            {beautifyName(lead.status)}
          </Text>
        </View>
      </View>
      
      <View style={componentStyles.leadCardMeta}>
        <Text style={componentStyles.leadCardMetaText}>
          👤 {lead.assigned_to.full_name}
        </Text>
        <Text style={componentStyles.leadCardMetaText}>
          🏷️ {beautifyName(lead.phase)}
        </Text>
      </View>
      
      <View style={componentStyles.leadCardFooter}>
        <Text style={componentStyles.leadCardDate}>
          {formatDate(lead.created_at || lead.createdAt)}
        </Text>
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
  
  const handleSave = async () => {
    if (!selectedLead || !token) return;
    
    try {
      const updatePayload: any = {
        token: token,
        lead_id: selectedLead.id
      };

      if (editingEmails.length > 0) updatePayload.emails = editingEmails;
      if (editingPhones.length > 0) updatePayload.phone_numbers = editingPhones;

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

  return (
    <SafeAreaView style={[componentStyles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.white} />

      <View style={componentStyles.header}>
        <TouchableOpacity style={componentStyles.backButton} onPress={onBack}>
          <BackIcon />
        </TouchableOpacity>
        <Text style={componentStyles.headerTitle}>Lead Details</Text>
        <TouchableOpacity 
          style={componentStyles.editButton}
          onPress={isEditMode ? handleSave : () => setIsEditMode(true)}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.primary} size="small" />
          ) : (
            <Text style={componentStyles.editButtonText}>{isEditMode ? 'Save' : 'Edit'}</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={componentStyles.detailScrollView} showsVerticalScrollIndicator={false}>
        {/* Lead Info Card */}
        <View style={componentStyles.detailCard}>
          <Text style={componentStyles.leadDetailName}>{selectedLead.name}</Text>
          <View style={componentStyles.leadDetailMeta}>
            <View style={[componentStyles.statusBadge, { backgroundColor: getStatusColor(selectedLead.status) + '20' }]}>
              <Text style={[componentStyles.statusBadgeText, { color: getStatusColor(selectedLead.status) }]}>
                {beautifyName(selectedLead.status)}
              </Text>
            </View>
            <Text style={componentStyles.leadDetailDate}>
              {formatDateTime(selectedLead.updated_at)}
            </Text>
          </View>
          <Text style={componentStyles.leadDetailCompany}>{selectedLead.company || 'No company'}</Text>
          <Text style={componentStyles.leadDetailAssigned}>
            Assigned to: {selectedLead.assigned_to.full_name}
          </Text>
        </View>

        {/* Contact Info */}
        <View style={componentStyles.section}>
          <Text style={componentStyles.sectionTitle}>Contact Information</Text>
          
          {/* Emails */}
          <View style={componentStyles.subsection}>
            <Text style={componentStyles.subsectionTitle}>Emails ({editingEmails.length})</Text>
            {editingEmails.map((email, index) => (
              <View key={index} style={componentStyles.contactItem}>
                <Text style={componentStyles.contactItemText}>📧 {email}</Text>
                {isEditMode && (
                  <TouchableOpacity onPress={() => handleRemoveEmail(index)}>
                    <Text style={componentStyles.removeText}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
            {isEditMode && (
              <View style={componentStyles.addContactRow}>
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

          {/* Phones */}
          <View style={componentStyles.subsection}>
            <Text style={componentStyles.subsectionTitle}>Phones ({editingPhones.length})</Text>
            {editingPhones.map((phone, index) => (
              <View key={index} style={componentStyles.contactItem}>
                <Text style={componentStyles.contactItemText}>📱 {phone}</Text>
                {isEditMode && (
                  <TouchableOpacity onPress={() => handleRemovePhone(index)}>
                    <Text style={componentStyles.removeText}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
            {isEditMode && (
              <View style={componentStyles.addContactRow}>
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
        </View>

        {/* Collaborators */}
        <View style={componentStyles.section}>
          <Text style={componentStyles.sectionTitle}>Collaborators ({collaborators.length})</Text>
          {loadingCollaborators ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <>
              {collaborators.map((collab) => (
                <View key={collab.id} style={componentStyles.collaboratorItem}>
                  <View>
                    <Text style={componentStyles.collaboratorName}>{collab.user.full_name}</Text>
                    <Text style={componentStyles.collaboratorEmail}>{collab.user.email}</Text>
                  </View>
                  {isEditMode && (
                    <TouchableOpacity onPress={() => {
                      Alert.alert(
                        'Remove Collaborator',
                        `Remove ${collab.user.full_name}?`,
                        [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Remove', style: 'destructive', onPress: () => handleRemoveCollaborator(collab.id) }
                        ]
                      );
                    }}>
                      <Text style={componentStyles.removeText}>✕</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
              {isEditMode && (
                <View style={componentStyles.addContactRow}>
                  <TextInput
                    style={[componentStyles.input, { flex: 1 }]}
                    value={newCollaborator}
                    onChangeText={setNewCollaborator}
                    placeholder="Add collaborator email..."
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="email-address"
                  />
                  <TouchableOpacity style={componentStyles.addButton} onPress={handleAddCollaborator}>
                    <Text style={componentStyles.addButtonText}>+</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}
        </View>

        {/* Comments */}
        <View style={componentStyles.section}>
          <Text style={componentStyles.sectionTitle}>Comments ({comments.length})</Text>
          
          {loadingComments ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.lg }} />
          ) : (
            <>
              {comments.map((comment) => (
                <View key={comment.id} style={componentStyles.commentCard}>
                  <View style={componentStyles.commentHeader}>
                    <Text style={componentStyles.commentAuthor}>{comment.commentBy}</Text>
                    <Text style={componentStyles.commentDate}>{formatDateTime(comment.date)}</Text>
                  </View>
                  <Text style={componentStyles.commentContent}>{comment.content}</Text>
                  {comment.documents && comment.documents.length > 0 && (
                    <View style={componentStyles.commentAttachments}>
                      {comment.documents.map((doc) => (
                        <Text key={doc.id} style={componentStyles.attachmentText}>
                          📎 {doc.document_name}
                        </Text>
                      ))}
                    </View>
                  )}
                </View>
              ))}
            </>
          )}

          {/* Add Comment */}
          <View style={componentStyles.addCommentSection}>
            <TextInput
              style={componentStyles.commentInput}
              value={newComment}
              onChangeText={setNewComment}
              placeholder="Add a comment..."
              multiline
              placeholderTextColor={colors.textSecondary}
            />
            <View style={componentStyles.commentActions}>
              <TouchableOpacity style={componentStyles.attachButton} onPress={handleAttachDocuments}>
                <Text style={componentStyles.attachButtonText}>📎 Attach</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[componentStyles.sendButton, addingComment && { opacity: 0.6 }]} 
                onPress={handleAddComment}
                disabled={addingComment}
              >
                {addingComment ? (
                  <ActivityIndicator color={colors.white} size="small" />
                ) : (
                  <Text style={componentStyles.sendButtonText}>Send</Text>
                )}
              </TouchableOpacity>
            </View>
            {selectedDocuments.length > 0 && (
              <Text style={componentStyles.attachedFilesText}>
                {selectedDocuments.length} file(s) attached
              </Text>
            )}
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
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
      <StatusBar barStyle="light-content" />

      <View style={componentStyles.header}>
        <TouchableOpacity style={componentStyles.backButton} onPress={onBack}>
          <BackIcon />
        </TouchableOpacity>
        <Text style={componentStyles.headerTitle}>Create Lead</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={componentStyles.detailScrollView} showsVerticalScrollIndicator={false}>
        <View style={componentStyles.section}>
          <Text style={componentStyles.sectionTitle}>Basic Information</Text>
          
          <TextInput
            style={componentStyles.input}
            value={newLeadName}
            onChangeText={setNewLeadName}
            placeholder="Lead name *"
            placeholderTextColor={colors.textSecondary}
          />

          <TextInput
            style={componentStyles.input}
            value={newLeadCompany}
            onChangeText={setNewLeadCompany}
            placeholder="Company name"
            placeholderTextColor={colors.textSecondary}
          />

          <TextInput
            style={componentStyles.input}
            value={newLeadAssignedTo}
            onChangeText={setNewLeadAssignedTo}
            placeholder="Assign to (BDT email) *"
            placeholderTextColor={colors.textSecondary}
            keyboardType="email-address"
          />
        </View>

        <TouchableOpacity 
          style={[componentStyles.createButton, creatingLead && { opacity: 0.6 }]}
          onPress={createLead}
          disabled={creatingLead}
        >
          {creatingLead ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={componentStyles.createButtonText}>Create Lead</Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>
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
      <StatusBar barStyle="light-content" />

      <View style={componentStyles.header}>
        <TouchableOpacity style={componentStyles.backButton} onPress={onBack}>
          <BackIcon />
        </TouchableOpacity>
        <Text style={componentStyles.headerTitle}>Default Comments</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={componentStyles.detailScrollView} showsVerticalScrollIndicator={false}>
        <View style={componentStyles.section}>
          <Text style={componentStyles.sectionTitle}>Add New Comment</Text>
          
          <TouchableOpacity
            style={componentStyles.dropdown}
            onPress={() => setActiveDropdown('phase')}
          >
            <Text style={componentStyles.dropdownText}>
              {selectedDefaultCommentPhase ? beautifyName(selectedDefaultCommentPhase) : 'Select Phase'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[componentStyles.dropdown, !selectedDefaultCommentPhase && { opacity: 0.5 }]}
            onPress={() => selectedDefaultCommentPhase && setActiveDropdown('subphase')}
            disabled={!selectedDefaultCommentPhase}
          >
            <Text style={componentStyles.dropdownText}>
              {selectedDefaultCommentSubphase ? beautifyName(selectedDefaultCommentSubphase) : 'Select Subphase'}
            </Text>
          </TouchableOpacity>

          <TextInput
            style={[componentStyles.input, { minHeight: 100, textAlignVertical: 'top' }]}
            value={newDefaultCommentText}
            onChangeText={setNewDefaultCommentText}
            placeholder="Enter comment text..."
            multiline
            placeholderTextColor={colors.textSecondary}
          />

          <TouchableOpacity 
            style={[componentStyles.createButton, addingDefaultComment && { opacity: 0.6 }]}
            onPress={addDefaultComment}
            disabled={addingDefaultComment}
          >
            {addingDefaultComment ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={componentStyles.createButtonText}>Add Comment</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={componentStyles.section}>
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
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: { padding: spacing.sm },
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
    borderColor: colors.text,
    transform: [{ rotate: '-45deg' }],
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
    marginLeft: spacing.md,
  },
  editButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
  },
  editButtonText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },

  leadCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  leadCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  leadCardInfo: {
    flex: 1,
  },
  leadCardName: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  leadCardCompany: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    alignItems: 'center',
  },
  statusBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  leadCardMeta: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  leadCardMetaText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  leadCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leadCardDate: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
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

  detailCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  detailScrollView: {
    flex: 1,
    backgroundColor: colors.background,
  },
  section: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
  },
  subsection: {
    marginBottom: spacing.lg,
  },
  subsectionTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },

  leadDetailName: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  leadDetailMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  leadDetailDate: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  leadDetailCompany: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  leadDetailAssigned: {
    fontSize: fontSize.sm,
    color: colors.info,
    fontWeight: '500',
  },

  contactItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  contactItemText: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: '500',
  },
  removeText: {
    fontSize: fontSize.lg,
    color: colors.error,
    fontWeight: '600',
  },
  addContactRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: fontSize.sm,
    color: colors.text,
    backgroundColor: colors.white,
    marginBottom: spacing.md,
  },
  addButton: {
    backgroundColor: colors.primary,
    width: 40,
    height: 40,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    color: colors.white,
    fontSize: fontSize.lg,
    fontWeight: '600',
  },

  collaboratorItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  collaboratorName: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: '600',
  },
  collaboratorEmail: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },

  commentCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.info,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  commentAuthor: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
  },
  commentDate: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  commentContent: {
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  commentAttachments: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  attachmentText: {
    fontSize: fontSize.xs,
    color: colors.info,
    marginBottom: spacing.xs,
  },

  addCommentSection: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: fontSize.sm,
    color: colors.text,
    backgroundColor: colors.background,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: spacing.sm,
  },
  commentActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  attachButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  attachButtonText: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: '500',
  },
  sendButton: {
    flex: 1,
    paddingVertical: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  sendButtonText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  attachedFilesText: {
    fontSize: fontSize.xs,
    color: colors.info,
    fontStyle: 'italic',
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

  dropdown: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    marginBottom: spacing.md,
    justifyContent: 'center',
  },
  dropdownText: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: '500',
  },

  createButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginVertical: spacing.lg,
  },
  createButtonText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: '600',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  dropdownContainer: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    maxHeight: screenHeight * 0.6,
    ...shadows.lg,
  },
  dropdownTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
  dropdownList: {
    maxHeight: screenHeight * 0.4,
  },
  dropdownItem: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dropdownItemText: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: '500',
  },
  emptyDropdown: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  emptyDropdownText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
});