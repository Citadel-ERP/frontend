// hr_employee_management/document.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
  Linking,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { BACKEND_URL } from '../../config/config';
import { WHATSAPP_COLORS } from './constants';
import { styles } from './styles';

interface Employee {
  employee_id: string;
  full_name: string;
}

interface DocumentProps {
  visible: boolean;
  onClose: () => void;
  employee: Employee;
  token: string;
}

interface DocumentData {
  id: string;
  document: string;
  created_at: string;
}

const DocumentModal: React.FC<DocumentProps> = ({
  visible,
  onClose,
  employee,
  token,
}) => {
  const [documents, setDocuments] = useState<DocumentData[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<any>(null);

  useEffect(() => {
    if (visible) {
      fetchDocuments();
    }
  }, [visible]);

  // Reset state when upload modal closes
  useEffect(() => {
    if (!showUploadModal) {
      setSelectedFile(null);
    }
  }, [showUploadModal]);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/manager/getAllDocuments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          employee_id: employee.employee_id
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setDocuments(data.documents || []);
      } else {
        const errorData = await response.json();
        Alert.alert('Error', errorData.message || 'Failed to fetch documents');
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
      Alert.alert('Error', 'Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
        multiple: false, // Only allow single file selection
      });

      console.log('Document picker result:', result);

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        setSelectedFile(file);
      } else {
        console.log('Document selection cancelled');
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      Alert.alert('Error', 'Please select a document file');
      return;
    }

    uploadDocument();
  };

  const uploadDocument = async () => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('token', token);
      formData.append('employee_id', employee.employee_id);
      
      // Use the correct property names from the expo-document-picker API
      const fileUri = selectedFile.uri;
      const fileName = selectedFile.name;
      const mimeType = selectedFile.mimeType || 'application/octet-stream';
      
      formData.append('document', {
        uri: fileUri,
        type: mimeType,
        name: fileName,
      } as any);

      console.log('Uploading document:', {
        fileName,
        mimeType
      });

      const response = await fetch(`${BACKEND_URL}/manager/addDocument`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        Alert.alert('Success', 'Document uploaded successfully');
        setShowUploadModal(false);
        // State will be reset by useEffect
        fetchDocuments();
      } else {
        const errorData = await response.json();
        Alert.alert('Error', errorData.message || 'Failed to upload document');
      }
    } catch (error) {
      console.error('Error uploading document:', error);
      Alert.alert('Error', 'Network error occurred');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (documentId: string, docUrl: string) => {
    // Extract filename from URL for display
    const docName = docUrl.split('/').pop() || 'this document';
    
    Alert.alert(
      'Delete Document',
      `Are you sure you want to delete "${docName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`${BACKEND_URL}/manager/deleteDocument`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  token,
                  document_id: documentId
                }),
              });

              if (response.ok) {
                Alert.alert('Success', 'Document deleted successfully');
                fetchDocuments();
              } else {
                const errorData = await response.json();
                Alert.alert('Error', errorData.message || 'Failed to delete document');
              }
            } catch (error) {
              console.error('Error deleting document:', error);
              Alert.alert('Error', 'Network error occurred');
            }
          }
        }
      ]
    );
  };

  const handleDownload = async (documentUrl: string, docName: string) => {
    try {
      const supported = await Linking.canOpenURL(documentUrl);
      if (supported) {
        await Linking.openURL(documentUrl);
      } else {
        Alert.alert('Error', 'Cannot open this file');
      }
    } catch (error) {
      console.error('Error downloading document:', error);
      Alert.alert('Error', 'Failed to download document');
    }
  };

  const getFileIcon = (documentUrl: string) => {
    const fileName = documentUrl.split('/').pop() || '';
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf':
        return 'document-text';
      case 'doc':
      case 'docx':
        return 'document';
      case 'xls':
      case 'xlsx':
        return 'grid';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return 'image';
      default:
        return 'document-attach';
    }
  };

  const getFileColor = (documentUrl: string) => {
    const fileName = documentUrl.split('/').pop() || '';
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf':
        return '#D32F2F';
      case 'doc':
      case 'docx':
        return '#2196F3';
      case 'xls':
      case 'xlsx':
        return '#4CAF50';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return '#FF9800';
      default:
        return WHATSAPP_COLORS.primary;
    }
  };

  const getFileName = (documentUrl: string) => {
    return documentUrl.split('/').pop() || 'document';
  };

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={onClose}
      >
        <View style={styles.assetsModalOverlay}>
          <View style={styles.assetsModalContainer}>
            <View style={styles.assetsModalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <Ionicons name="folder-outline" size={24} color={WHATSAPP_COLORS.primary} />
                <Text style={[styles.assetsModalTitle, { marginLeft: 8 }]}>
                  Documents
                </Text>
              </View>
              
              <TouchableOpacity
                style={styles.uploadPayslipButton}
                onPress={() => setShowUploadModal(true)}
              >
                <Ionicons name="cloud-upload-outline" size={18} color="#fff" />
                <Text style={styles.uploadPayslipButtonText}>Upload</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={onClose} style={{ marginLeft: 12 }}>
                <Ionicons name="close" size={28} color={WHATSAPP_COLORS.textPrimary} />
              </TouchableOpacity>
            </View>

            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={WHATSAPP_COLORS.primary} />
                <Text style={styles.loadingText}>Loading documents...</Text>
              </View>
            ) : (
              <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {documents.length > 0 ? (
                  <View style={{ padding: 16 }}>
                    {documents.map((doc) => {
                      const fileName = getFileName(doc.document);
                      return (
                        <View key={doc.id} style={styles.documentCard}>
                          <View style={[
                            styles.documentIconContainer,
                            { backgroundColor: `${getFileColor(doc.document)}15` }
                          ]}>
                            <Ionicons 
                              name={getFileIcon(doc.document) as any} 
                              size={32} 
                              color={getFileColor(doc.document)} 
                            />
                          </View>
                          
                          <View style={styles.documentInfo}>
                            <Text style={styles.documentName} numberOfLines={1}>
                              {fileName}
                            </Text>
                            <Text style={styles.documentDate}>
                              Uploaded: {new Date(doc.created_at).toLocaleDateString()}
                            </Text>
                          </View>

                          <View style={styles.documentActions}>
                            <TouchableOpacity
                              style={styles.documentActionButton}
                              onPress={() => handleDownload(doc.document, fileName)}
                              activeOpacity={0.7}
                            >
                              <Ionicons name="download-outline" size={20} color={WHATSAPP_COLORS.primary} />
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={[styles.documentActionButton, { marginLeft: 8 }]}
                              onPress={() => handleDelete(doc.id, doc.document)}
                              activeOpacity={0.7}
                            >
                              <Ionicons name="trash-outline" size={20} color="#D32F2F" />
                            </TouchableOpacity>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                ) : (
                  <View style={styles.emptyState}>
                    <Ionicons name="folder-open-outline" size={64} color={WHATSAPP_COLORS.textTertiary} />
                    <Text style={styles.emptyStateTitle}>No Documents Found</Text>
                    <Text style={styles.emptyStateMessage}>
                      Upload documents to get started
                    </Text>
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Upload Modal with Keyboard Handling */}
      <Modal
        visible={showUploadModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowUploadModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={styles.modalOverlay}
            onPress={() => setShowUploadModal(false)}
          >
            <TouchableOpacity
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
            >
              <ScrollView
                contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}
                keyboardShouldPersistTaps="handled"
              >
                <View style={[styles.modalContainer, { maxWidth: 500, marginVertical: 20, width: 300,marginLeft:-20 }]}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Upload Document</Text>
                  </View>

                  <View style={{ marginBottom: 20 }}>
                    <Text style={styles.editLabel}>Document File</Text>
                    <TouchableOpacity
                      style={styles.filePickerButton}
                      onPress={pickDocument}
                    >
                      <Ionicons name="document-attach-outline" size={24} color={WHATSAPP_COLORS.primary} />
                      <Text style={styles.filePickerText}>
                        {selectedFile ? selectedFile.name : 'Select document file'}
                      </Text>
                    </TouchableOpacity>

                    {selectedFile && (
                      <View style={styles.selectedFileContainer}>
                        <Ionicons 
                          name={getFileIcon(selectedFile.name) as any} 
                          size={20} 
                          color={WHATSAPP_COLORS.primary} 
                        />
                        <Text style={styles.selectedFileName} numberOfLines={1}>
                          {selectedFile.name}
                        </Text>
                        <TouchableOpacity onPress={() => setSelectedFile(null)}>
                          <Ionicons name="close-circle" size={20} color="#D32F2F" />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>

                  <View style={styles.modalButtons}>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.cancelButton]}
                      onPress={() => setShowUploadModal(false)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.modalButton,
                        styles.submitButton,
                        (!selectedFile || uploading) && styles.disabledButton
                      ]}
                      onPress={handleUpload}
                      disabled={!selectedFile || uploading}
                      activeOpacity={0.7}
                    >
                      {uploading ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={styles.submitButtonText}>Upload</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </ScrollView>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
};

export default DocumentModal;