import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  FlatList,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useOffices } from './hooks/useOffices';
import { DeleteOffice } from './components/DeleteOffice';
import { CreateOffice } from './components/CreateOffice';
import { OfficeHeader } from './components/OfficeHeader';
import { Office, OfficeFormData } from './types/office.types';
import { UpdateOffice } from './components/UpdateOffice';
import { OfficeCard } from './components/OfficeCard';

interface OfficeModuleProps {
  onBack: () => void;
  isDark?: boolean;
}

type ModalState = 'none' | 'create' | 'update' | 'delete';

export default function OfficeModule({ onBack, isDark = false }: OfficeModuleProps) {
  const {
    offices,
    loading,
    refreshing,
    deleteModalVisible,
    selectedOffice,
    deleteLoading,
    fetchOffices,
    createOffice,
    updateOffice,
    confirmDelete,
    deleteOffice,
    cancelDelete,
  } = useOffices();

  const [modalState, setModalState] = useState<ModalState>('none');
  const [editingOffice, setEditingOffice] = useState<Office | null>(null);

  const handleCreate = () => {
    setEditingOffice(null);
    setModalState('create');
  };

  const handleEdit = (office: Office) => {
    setEditingOffice(office);
    setModalState('update');
  };

  const handleDelete = (office: Office) => {
    confirmDelete(office);
    setModalState('delete');
  };

  const handleSubmitCreate = async (formData: OfficeFormData): Promise<boolean> => {
    const success = await createOffice(formData);
    if (success) {
      setModalState('none');
    }
    return success;
  };

  const handleSubmitUpdate = async (formData: OfficeFormData): Promise<boolean> => {
    if (!editingOffice) return false;
    const success = await updateOffice(editingOffice.id, formData);
    if (success) {
      setModalState('none');
      setEditingOffice(null);
    }
    return success;
  };

  const handleDeleteConfirm = async () => {
    await deleteOffice();
    setModalState('none');
  };

  const handleCancel = () => {
    setModalState('none');
    setEditingOffice(null);
    cancelDelete();
  };

  const theme = {
    bgColor: isDark ? '#050b18' : '#ece5dd',
    cardBg: isDark ? '#111a2d' : '#f6f6f6',
    textMain: isDark ? '#ffffff' : '#333333',
    textSub: isDark ? '#a0a0a0' : '#666666',
    accentBlue: '#008069',
  };

  const renderOfficeItem = ({ item }: { item: Office }) => (
    <OfficeCard
      key={item.id}
      office={item}
      onEdit={handleEdit}
      onDelete={handleDelete}
      isDark={isDark}
    />
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bgColor }]}>
      {/* Header */}
      <OfficeHeader
        onBack={onBack}
        onCreate={handleCreate}
        isDark={isDark}
      />

      {/* Content */}
      {loading && !refreshing && offices.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.accentBlue} />
          <Text style={[styles.loadingText, { color: theme.textSub }]}>
            Loading offices...
          </Text>
        </View>
      ) : offices.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="business-outline" size={80} color={theme.textSub} />
          <Text style={[styles.emptyTitle, { color: theme.textMain }]}>
            No Offices Found
          </Text>
          <Text style={[styles.emptyText, { color: theme.textSub }]}>
            Click the + button to create your first office location
          </Text>
        </View>
      ) : (
        <FlatList
          data={offices}
          renderItem={renderOfficeItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchOffices(true)}
              tintColor={theme.accentBlue}
            />
          }
        />
      )}

      {/* ── CREATE MODAL ── */}
      <Modal
        visible={modalState === 'create'}
        transparent
        animationType="slide"
        onRequestClose={handleCancel}
        statusBarTranslucent
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <CreateOffice
              onSubmit={handleSubmitCreate}
              onCancel={handleCancel}
              loading={loading}
            />
          </View>
        </View>
      </Modal>

      {/* ── UPDATE MODAL ── */}
      <Modal
        visible={modalState === 'update' && editingOffice !== null}
        transparent
        animationType="slide"
        onRequestClose={handleCancel}
        statusBarTranslucent
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            {editingOffice && (
              <UpdateOffice
                office={editingOffice}
                onSubmit={handleSubmitUpdate}
                onCancel={handleCancel}
                loading={loading}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* ── DELETE MODAL ── (uses its own internal Modal, so no wrapper needed) */}
      <DeleteOffice
        visible={modalState === 'delete'}
        office={selectedOffice}
        loading={deleteLoading}
        onConfirm={handleDeleteConfirm}
        onCancel={handleCancel}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    // flex: 1,
    backgroundColor: '#FFFFFF',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  // Semi-transparent backdrop that fills the screen
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',   // Sheet slides up from the bottom
  },
  // The white sheet that contains the form
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
    overflow: 'hidden',
    // Shadow for iOS
    minHeight: 600, 
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    // Shadow for Android
    elevation: 20,
  },
});