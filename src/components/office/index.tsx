import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useOffices } from './hooks/useOffices';
import { DeleteOffice } from './components/DeleteOffice';
import { CreateOffice } from './components/CreateOffice';
import { OfficeHeader } from './components/OfficeHeader';
import { ListOffices } from './components/ListOffices';
import { Office, OfficeFormData } from './types/office.types';
import { UpdateOffice } from './components/UpdateOffice';
import { globalStyles } from './styles';
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

  // Theme colors
  const theme = {
    bgColor: isDark ? '#050b18' : '#ece5dd',
    cardBg: isDark ? '#111a2d' : '#f6f6f6',
    textMain: isDark ? '#ffffff' : '#333333',
    textSub: isDark ? '#a0a0a0' : '#666666',
    accentBlue: '#008069',
  };

  // Render content - use FlatList instead of ScrollView
  const renderContent = () => {
    if (loading && !refreshing) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.accentBlue} />
          <Text style={[styles.loadingText, { color: theme.textSub }]}>
            Loading offices...
          </Text>
        </View>
      );
    }

    if (offices.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="business-outline" size={80} color={theme.textSub} />
          <Text style={[styles.emptyTitle, { color: theme.textMain }]}>
            No Offices Found
          </Text>
          <Text style={[styles.emptyText, { color: theme.textSub }]}>
            Click the + button to create your first office location
          </Text>
        </View>
      );
    }

    return null;
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

      {/* Content - Use FlatList to avoid nesting issues */}
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
          scrollEnabled={modalState === 'none'}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchOffices(true)}
              tintColor={theme.accentBlue}
            />
          }
        />
      )}

      {/* Create Modal */}
      {modalState === 'create' && (
        <View style={styles.modalContainer}>
          <CreateOffice
            onSubmit={handleSubmitCreate}
            onCancel={handleCancel}
            loading={loading}
          />
        </View>
      )}

      {/* Update Modal */}
      {modalState === 'update' && editingOffice && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <UpdateOffice
              office={editingOffice}
              onSubmit={handleSubmitUpdate}
              onCancel={handleCancel}
              loading={loading}
            />
          </View>
        </View>
      )}

      {/* Delete Modal */}
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
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 400,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 400,
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
  modalContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    width: '90%',
    maxWidth: 500,
    maxHeight: '85%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});