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
  Platform,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { BACKEND_URL } from '../../config/config';
import { WHATSAPP_COLORS } from './constants';
import { styles } from './styles';
import alert from '../../utils/Alert';

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
  file_name: string;
  created_at: string;
}

const PREDEFINED_DOCUMENT_TYPES = [
  { id: 'aadhaar', name: 'Aadhaar Card', icon: 'card-outline' },
  { id: 'pan', name: 'PAN Card', icon: 'card-outline' },
  { id: 'educational', name: 'Educational Documents', icon: 'school-outline' },
  { id: 'offer_letter', name: 'Offer / Appointment Letter', icon: 'document-text-outline' },
  { id: 'relieving', name: 'Relieving / Experience Letter', icon: 'briefcase-outline' },
  { id: 'bank_statement', name: 'Bank Statement', icon: 'cash-outline' },
  { id: 'form16', name: 'Previous Form 16', icon: 'receipt-outline' },
  { id: 'passport', name: 'Passport', icon: 'airplane-outline' },
  { id: 'epfo', name: 'EPFO Number (UAN)', icon: 'shield-checkmark-outline' },
  { id: 'custom', name: 'Other Document', icon: 'document-attach-outline' },
];

const DocumentModal: React.FC<DocumentProps> = ({
  visible,
  onClose,
  employee,
  token,
}) => {
  const [documents, setDocuments] = useState<DocumentData[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [modalMode, setModalMode] = useState<'list' | 'select' | 'upload'>('list');
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [selectedDocType, setSelectedDocType] = useState<string>('');
  const [customFileName, setCustomFileName] = useState('');

  useEffect(() => {
    if (visible) {
      fetchDocuments();
      setModalMode('list');
    }
  }, [visible]);

  useEffect(() => {
    if (modalMode === 'list') {
      setSelectedFile(null);
      setSelectedDocType('');
      setCustomFileName('');
    }
  }, [modalMode]);

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
        alert('Error', errorData.message || 'Failed to fetch documents');
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
      alert('Error', 'Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        setSelectedFile(file);
      }
    } catch (error) {
      console.error('Error picking document:', error);
      alert('Error', 'Failed to pick document');
    }
  };

  const handleDocumentTypeSelect = (docType: string) => {
    setSelectedDocType(docType);
    setModalMode('upload');
  };

  const uploadDocument = async () => {
    if (!selectedFile) {
      alert('Error', 'Please select a file');
      return;
    }

    if (selectedDocType === 'custom' && !customFileName.trim()) {
      alert('Error', 'Please enter a document name');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('token', token);
      formData.append('employee_id', employee.employee_id);

      const fileUri = selectedFile.uri;
      const fileName = selectedFile.name;
      const mimeType = selectedFile.mimeType || 'application/octet-stream';

      // Handle file upload differently for web
      // For web, we need to fetch the file and append it as a Blob
      if (Platform.OS === 'web') {
        // For web, we need to fetch the file and append it as a Blob
        const response = await fetch(fileUri);
        const blob = await response.blob();
        // Create a File object from the Blob with the filename
        const file = new File([blob], fileName, { type: mimeType });
        formData.append('document', file);
      } else {
        // For mobile (iOS/Android)
        formData.append('document', {
          uri: fileUri,
          type: mimeType,
          name: fileName,
        } as any);
      }

      // Add file_name based on selection
      if (selectedDocType === 'custom') {
        formData.append('file_name', customFileName.trim());
      } else {
        const docType = PREDEFINED_DOCUMENT_TYPES.find(d => d.id === selectedDocType);
        if (docType) {
          formData.append('file_name', docType.name);
        }
      }

      const response = await fetch(`${BACKEND_URL}/manager/addDocument`, {
        method: 'POST',
        body: formData,
        headers: Platform.OS === 'web' ? {} : {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.ok) {
        alert('Success', 'Document uploaded successfully');
        setModalMode('list');
        fetchDocuments();
      } else {
        const errorData = await response.json();
        alert('Error', errorData.message || 'Failed to upload document');
      }
    } catch (error) {
      console.error('Error uploading document:', error);
      alert('Error', 'Network error occurred');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (documentId: string, docName: string) => {
    alert(
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
                alert('Success', 'Document deleted successfully');
                fetchDocuments();
              } else {
                const errorData = await response.json();
                alert('Error', errorData.message || 'Failed to delete document');
              }
            } catch (error) {
              console.error('Error deleting document:', error);
              alert('Error', 'Network error occurred');
            }
          }
        }
      ]
    );
  };

  const handleDownload = async (documentUrl: string) => {
    try {
      const supported = await Linking.canOpenURL(documentUrl);
      if (supported) {
        await Linking.openURL(documentUrl);
      } else {
        alert('Error', 'Cannot open this file');
      }
    } catch (error) {
      console.error('Error downloading document:', error);
      alert('Error', 'Failed to download document');
    }
  };

  const getFileIcon = (fileName: string) => {
    const lowerName = fileName.toLowerCase();

    if (lowerName.includes('aadhaar') || lowerName.includes('aadhar')) return 'card-outline';
    if (lowerName.includes('pan')) return 'card-outline';
    if (lowerName.includes('education') || lowerName.includes('degree') || lowerName.includes('certificate')) return 'school-outline';
    if (lowerName.includes('offer') || lowerName.includes('appointment')) return 'document-text-outline';
    if (lowerName.includes('relieving') || lowerName.includes('experience')) return 'briefcase-outline';
    if (lowerName.includes('bank') || lowerName.includes('statement')) return 'cash-outline';
    if (lowerName.includes('form') || lowerName.includes('16')) return 'receipt-outline';
    if (lowerName.includes('passport')) return 'airplane-outline';
    if (lowerName.includes('epfo') || lowerName.includes('uan')) return 'shield-checkmark-outline';

    return 'document-attach-outline';
  };

  const getFileColor = (fileName: string) => {
    const lowerName = fileName.toLowerCase();

    if (lowerName.includes('aadhaar') || lowerName.includes('aadhar')) return '#2196F3';
    if (lowerName.includes('pan')) return '#4CAF50';
    if (lowerName.includes('education') || lowerName.includes('degree')) return '#9C27B0';
    if (lowerName.includes('offer') || lowerName.includes('appointment')) return '#FF9800';
    if (lowerName.includes('relieving') || lowerName.includes('experience')) return '#00BCD4';
    if (lowerName.includes('bank')) return '#4CAF50';
    if (lowerName.includes('form')) return '#D32F2F';
    if (lowerName.includes('passport')) return '#3F51B5';
    if (lowerName.includes('epfo') || lowerName.includes('uan')) return '#795548';

    return WHATSAPP_COLORS.primary;
  };

  const renderSelectDocumentType = () => (
    <ScrollView
      style={styles.content}
      contentContainerStyle={{ padding: 16 }}
      showsVerticalScrollIndicator={false}
    >
      <Text style={{
        fontSize: 16,
        color: WHATSAPP_COLORS.textSecondary,
        marginBottom: 20,
        paddingHorizontal: 4,
      }}>
        Select the type of document you want to upload
      </Text>

      <View style={{ gap: 12 }}>
        {PREDEFINED_DOCUMENT_TYPES.map((docType) => (
          <TouchableOpacity
            key={docType.id}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              padding: 16,
              backgroundColor: '#fff',
              borderRadius: 12,
              borderWidth: 1,
              borderColor: WHATSAPP_COLORS.border,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 3,
              elevation: 2,
            }}
            onPress={() => handleDocumentTypeSelect(docType.id)}
            activeOpacity={0.7}
          >
            <View style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: `${WHATSAPP_COLORS.primary}15`,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 16,
            }}>
              <Ionicons
                name={docType.icon as any}
                size={24}
                color={WHATSAPP_COLORS.primary}
              />
            </View>

            <Text style={{
              flex: 1,
              fontSize: 15,
              color: WHATSAPP_COLORS.textPrimary,
              fontWeight: '500',
            }}>
              {docType.name}
            </Text>

            <Ionicons
              name="chevron-forward"
              size={20}
              color={WHATSAPP_COLORS.textTertiary}
            />
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );

  const renderUploadForm = () => (
    <ScrollView
      style={styles.content}
      contentContainerStyle={{ padding: 24 }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={{ marginBottom: 24 }}>
        <Text style={{
          fontSize: 16,
          color: WHATSAPP_COLORS.textPrimary,
          fontWeight: '600',
          marginBottom: 8,
        }}>
          Document Type
        </Text>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          padding: 16,
          backgroundColor: `${WHATSAPP_COLORS.primary}10`,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: `${WHATSAPP_COLORS.primary}30`,
        }}>
          <Ionicons
            name={PREDEFINED_DOCUMENT_TYPES.find(d => d.id === selectedDocType)?.icon as any || 'document-outline'}
            size={24}
            color={WHATSAPP_COLORS.primary}
          />
          <Text style={{
            marginLeft: 12,
            fontSize: 15,
            color: WHATSAPP_COLORS.textPrimary,
            fontWeight: '500',
            flex: 1,
          }}>
            {PREDEFINED_DOCUMENT_TYPES.find(d => d.id === selectedDocType)?.name}
          </Text>
          <TouchableOpacity
            onPress={() => {
              setModalMode('select');
              setSelectedFile(null);
            }}
          >
            <Text style={{
              color: WHATSAPP_COLORS.primary,
              fontSize: 14,
              fontWeight: '600',
            }}>
              Change
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {selectedDocType === 'custom' && (
        <View style={{ marginBottom: 24 }}>
          <Text style={styles.editLabel}>Document Name *</Text>
          <TextInput
            style={styles.editInput}
            placeholder="e.g., Driving License, Voter ID..."
            placeholderTextColor={WHATSAPP_COLORS.textTertiary}
            value={customFileName}
            onChangeText={setCustomFileName}
          />
        </View>
      )}

      <View style={{ marginBottom: 20 }}>
        <Text style={styles.editLabel}>Select File *</Text>
        <TouchableOpacity
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            padding: 16,
            backgroundColor: '#fff',
            borderRadius: 12,
            borderWidth: 2,
            borderColor: selectedFile ? WHATSAPP_COLORS.primary : WHATSAPP_COLORS.border,
            borderStyle: 'dashed',
          }}
          onPress={pickDocument}
          activeOpacity={0.7}
        >
          <Ionicons
            name={selectedFile ? "checkmark-circle" : "cloud-upload-outline"}
            size={28}
            color={selectedFile ? WHATSAPP_COLORS.primary : WHATSAPP_COLORS.textTertiary}
          />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={{
              fontSize: 15,
              color: selectedFile ? WHATSAPP_COLORS.primary : WHATSAPP_COLORS.textSecondary,
              fontWeight: selectedFile ? '600' : '400',
            }}>
              {selectedFile ? selectedFile.name : 'Tap to select document'}
            </Text>
            {!selectedFile && (
              <Text style={{
                fontSize: 13,
                color: WHATSAPP_COLORS.textTertiary,
                marginTop: 2,
              }}>
                PDF, Images, or any document
              </Text>
            )}
          </View>
        </TouchableOpacity>

        {selectedFile && (
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginTop: 12,
            padding: 12,
            backgroundColor: '#F0F9FF',
            borderRadius: 8,
          }}>
            <Ionicons name="document" size={20} color="#0284C7" />
            <Text style={{
              flex: 1,
              marginLeft: 10,
              fontSize: 14,
              color: '#0C4A6E',
            }} numberOfLines={1}>
              {selectedFile.name}
            </Text>
            <TouchableOpacity onPress={() => setSelectedFile(null)}>
              <Ionicons name="close-circle" size={22} color="#DC2626" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={{
        padding: 16,
        backgroundColor: '#FEF3C7',
        borderRadius: 10,
        borderLeftWidth: 4,
        borderLeftColor: '#F59E0B',
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
          <Ionicons name="information-circle" size={20} color="#F59E0B" style={{ marginTop: 2 }} />
          <Text style={{
            flex: 1,
            marginLeft: 10,
            fontSize: 13,
            color: '#78350F',
            lineHeight: 18,
          }}>
            Make sure the document is clear and readable. Supported formats: PDF, JPG, PNG, DOC, etc.
          </Text>
        </View>
      </View>
    </ScrollView>
  );

  const renderListContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={WHATSAPP_COLORS.primary} />
          <Text style={styles.loadingText}>Loading documents...</Text>
        </View>
      );
    }

    return (
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        {documents.length > 0 ? (
          <View style={{ padding: 16 }}>
            {documents.map((doc, index) => {
              const displayName = doc.file_name || 'Document';
              const fileColor = getFileColor(displayName);
              const fileIcon = getFileIcon(displayName);

              return (
                <View
                  key={doc.id}
                  style={{
                    marginBottom: 12,
                    backgroundColor: '#fff',
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: WHATSAPP_COLORS.border,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.05,
                    shadowRadius: 4,
                    elevation: 2,
                    overflow: 'hidden',
                  }}
                >
                  <View style={{ padding: 16 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                      <View style={{
                        width: 52,
                        height: 52,
                        borderRadius: 12,
                        backgroundColor: `${fileColor}15`,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 14,
                      }}>
                        <Ionicons
                          name={fileIcon as any}
                          size={26}
                          color={fileColor}
                        />
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text style={{
                          fontSize: 16,
                          fontWeight: '600',
                          color: WHATSAPP_COLORS.textPrimary,
                          marginBottom: 6,
                        }} numberOfLines={2}>
                          {displayName}
                        </Text>

                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Ionicons name="calendar-outline" size={14} color={WHATSAPP_COLORS.textTertiary} />
                            <Text style={{
                              fontSize: 13,
                              color: WHATSAPP_COLORS.textTertiary,
                              marginLeft: 4,
                            }}>
                              {new Date(doc.created_at).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>

                    <View style={{
                      flexDirection: 'row',
                      marginTop: 14,
                      paddingTop: 14,
                      borderTopWidth: 1,
                      borderTopColor: WHATSAPP_COLORS.border,
                      gap: 10,
                    }}>
                      <TouchableOpacity
                        style={{
                          flex: 1,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'center',
                          paddingVertical: 10,
                          paddingHorizontal: 16,
                          backgroundColor: `${WHATSAPP_COLORS.primary}15`,
                          borderRadius: 8,
                        }}
                        onPress={() => handleDownload(doc.document)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="download-outline" size={18} color={WHATSAPP_COLORS.primary} />
                        <Text style={{
                          marginLeft: 6,
                          fontSize: 14,
                          fontWeight: '600',
                          color: WHATSAPP_COLORS.primary,
                        }}>
                          Download
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={{
                          flex: 1,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'center',
                          paddingVertical: 10,
                          paddingHorizontal: 16,
                          backgroundColor: '#FEE2E2',
                          borderRadius: 8,
                        }}
                        onPress={() => handleDelete(doc.id, displayName)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="trash-outline" size={18} color="#DC2626" />
                        <Text style={{
                          marginLeft: 6,
                          fontSize: 14,
                          fontWeight: '600',
                          color: '#DC2626',
                        }}>
                          Delete
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: 40,
            paddingVertical: 60,
          }}>
            <View style={{
              width: 120,
              height: 120,
              borderRadius: 60,
              backgroundColor: `${WHATSAPP_COLORS.textTertiary}10`,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 24,
            }}>
              <Ionicons name="folder-open-outline" size={64} color={WHATSAPP_COLORS.textTertiary} />
            </View>
            <Text style={{
              fontSize: 20,
              fontWeight: '600',
              color: WHATSAPP_COLORS.textPrimary,
              marginBottom: 8,
              textAlign: 'center',
            }}>
              No Documents Found
            </Text>
            <Text style={{
              fontSize: 15,
              color: WHATSAPP_COLORS.textSecondary,
              textAlign: 'center',
              lineHeight: 22,
            }}>
              Upload important documents to keep them organized and accessible
            </Text>
          </View>
        )}
      </ScrollView>
    );
  };

  const getHeaderTitle = () => {
    switch (modalMode) {
      case 'select':
        return 'Select Document Type';
      case 'upload':
        return 'Upload Document';
      default:
        return 'Documents';
    }
  };

  return (
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
              {modalMode !== 'list' && (
                <TouchableOpacity
                  onPress={() => {
                    if (modalMode === 'upload') {
                      setModalMode('select');
                      setSelectedFile(null);
                    } else {
                      setModalMode('list');
                    }
                  }}
                  style={{ marginRight: 12 }}
                >
                  <Ionicons name="arrow-back" size={24} color={WHATSAPP_COLORS.textPrimary} />
                </TouchableOpacity>
              )}
              <Ionicons name="folder-outline" size={24} color={WHATSAPP_COLORS.primary} />
              <Text style={[styles.assetsModalTitle, { marginLeft: 8 }]}>
                {getHeaderTitle()}
              </Text>
            </View>

            {modalMode === 'list' && (
              <TouchableOpacity
                style={styles.uploadPayslipButton}
                onPress={() => setModalMode('select')}
              >
                <Ionicons name="add-circle-outline" size={18} color="#fff" />
                <Text style={styles.uploadPayslipButtonText}>Add New</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity onPress={onClose} style={{ marginLeft: 12 }}>
              <Ionicons name="close" size={28} color={WHATSAPP_COLORS.textPrimary} />
            </TouchableOpacity>
          </View>

          {modalMode === 'list' && renderListContent()}
          {modalMode === 'select' && renderSelectDocumentType()}
          {modalMode === 'upload' && renderUploadForm()}

          {modalMode === 'upload' && (
            <View style={[styles.modalButtons, { marginBottom: 20, marginHorizontal: 20 }]}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setModalMode('select');
                  setSelectedFile(null);
                  setCustomFileName('');
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelButtonText}>Back</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.submitButton,
                  (!selectedFile || uploading || (selectedDocType === 'custom' && !customFileName.trim())) && styles.disabledButton
                ]}
                onPress={uploadDocument}
                disabled={!selectedFile || uploading || (selectedDocType === 'custom' && !customFileName.trim())}
                activeOpacity={0.7}
              >
                {uploading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="cloud-upload-outline" size={18} color="#fff" />
                    <Text style={[styles.submitButtonText, { marginLeft: 6 }]}>Upload</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

export default DocumentModal;