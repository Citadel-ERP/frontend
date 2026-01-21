import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from './styles';
import { Item, TabType } from './types';
import { WHATSAPP_COLORS } from './constants';

interface RequestsProps {
  items: Item[];
  loading: boolean;
  onItemPress: (item: Item) => void;
  onUpdateStatus: (item: Item, status: string) => void;
  activeTab: TabType;
  filterStatus: string | null;
  onFilterChange: (status: string | null) => void;
}

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  });
};

const getStatusConfig = (status: string): { color: string, label: string } => {
  switch (status) {
    case 'resolved': return { color: WHATSAPP_COLORS.green, label: 'Resolved' };
    case 'rejected': return { color: WHATSAPP_COLORS.red, label: 'Rejected' };
    case 'in_progress': return { color: WHATSAPP_COLORS.blue, label: 'In Progress' };
    case 'pending': return { color: WHATSAPP_COLORS.yellow, label: 'Pending' };
    case 'cancelled': return { color: WHATSAPP_COLORS.purple, label: 'Cancelled' };
    default: return { color: WHATSAPP_COLORS.gray, label: status };
  }
};

export const Requests: React.FC<RequestsProps> = ({
  items,
  loading,
  onItemPress,
  onUpdateStatus,
  activeTab,
  filterStatus,
  onFilterChange
}) => {
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [localFilter, setLocalFilter] = useState<string | null>(filterStatus);
  
  const itemType = activeTab === 'requests' ? 'Request' : 'Grievance';
  
  const filteredItems = filterStatus 
    ? items.filter(item => item.status === filterStatus)
    : items;

  const statusCounts = {
    pending: items.filter(item => item.status === 'pending').length,
    in_progress: items.filter(item => item.status === 'in_progress').length,
    resolved: items.filter(item => item.status === 'resolved').length,
    rejected: items.filter(item => item.status === 'rejected').length,
    cancelled: items.filter(item => item.status === 'cancelled').length,
  };

  const handleApplyFilter = () => {
    onFilterChange(localFilter);
    setShowFilterModal(false);
  };

  const handleResetFilter = () => {
    setLocalFilter(null);
    onFilterChange(null);
    setShowFilterModal(false);
  };

  return (
    <View style={styles.content}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.actionCardsContainer}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => setShowFilterModal(true)}
          >
            <View style={styles.actionCardIcon}>
              <Ionicons name="filter" size={24} color={WHATSAPP_COLORS.primary} />
            </View>
            <Text style={styles.actionCardTitle}>
              {filterStatus ? `Filtered: ${getStatusConfig(filterStatus).label}` : 'Filter Items'}
            </Text>
            <Text style={styles.actionCardSubtitle}>
              Tap to filter by status
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => onFilterChange(null)}
          >
            <View style={styles.actionCardIcon}>
              <Ionicons name="stats-chart" size={24} color={WHATSAPP_COLORS.blue} />
            </View>
            <Text style={styles.actionCardTitle}>
              {items.length} Total
            </Text>
            <Text style={styles.actionCardSubtitle}>
              {statusCounts.pending} pending
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.listSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {filterStatus ? `${getStatusConfig(filterStatus).label} ${itemType}s` : `All ${itemType}s`}
            </Text>
            <TouchableOpacity 
              style={styles.sectionFilter}
              onPress={() => setShowFilterModal(true)}
            >
              <Text style={styles.filterText}>
                {filterStatus ? 'Change Filter' : 'Filter'}
              </Text>
              <Ionicons name="chevron-down" size={16} color={WHATSAPP_COLORS.primary} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={WHATSAPP_COLORS.primary} />
              <Text style={styles.loadingText}>Loading {activeTab}...</Text>
            </View>
          ) : filteredItems.length > 0 ? (
            filteredItems.map((item) => {
              const statusConfig = getStatusConfig(item.status);
              const commentCount = item.comments?.length || 0;

              return (
                <TouchableOpacity
                  key={item.id}
                  style={styles.itemCard}
                  onPress={() => onItemPress(item)}
                  activeOpacity={0.7}
                >
                  <View style={styles.itemIcon}>
                    <Ionicons
                      name={activeTab === 'requests' ? 'document-text' : 'alert-circle'}
                      size={24}
                      color={WHATSAPP_COLORS.primary}
                    />
                  </View>
                  <View style={styles.itemContent}>
                    <View style={styles.itemHeader}>
                      <Text style={styles.itemTitle} numberOfLines={1}>
                        {item.nature}
                      </Text>
                      <View style={[
                        styles.itemStatus,
                        { backgroundColor: statusConfig.color }
                      ]}>
                        <Text style={styles.itemStatusText}>{statusConfig.label}</Text>
                      </View>
                    </View>
                    {item.employee_name && (
                      <Text style={styles.itemEmployee}>
                        By: {item.employee_name}
                      </Text>
                    )}
                    <Text style={styles.itemDescription} numberOfLines={2}>
                      {item.description || item.issue}
                    </Text>
                    <View style={styles.itemFooter}>
                      <View style={styles.itemMeta}>
                        <Ionicons name="time-outline" size={14} color={WHATSAPP_COLORS.gray} />
                        <Text style={styles.itemMetaText}>{formatDate(item.created_at)}</Text>
                        <Ionicons name="chatbubble-outline" size={14} color={WHATSAPP_COLORS.gray} style={styles.metaIcon} />
                        <Text style={styles.itemMetaText}>{commentCount} {commentCount === 1 ? 'comment' : 'comments'}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={WHATSAPP_COLORS.gray} />
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          ) : (
            <View style={styles.emptyState}>
              <Ionicons
                name={activeTab === 'requests' ? 'document-text-outline' : 'alert-circle-outline'}
                size={60}
                color={WHATSAPP_COLORS.gray}
              />
              <Text style={styles.emptyTitle}>
                No {filterStatus ? `${filterStatus} ` : ''}{activeTab}
              </Text>
              <Text style={styles.emptySubtitle}>
                {filterStatus 
                  ? `No ${activeTab} with status "${getStatusConfig(filterStatus).label}" found`
                  : `No ${activeTab} have been submitted yet`}
              </Text>
              {filterStatus && (
                <TouchableOpacity
                  style={styles.emptyButton}
                  onPress={() => onFilterChange(null)}
                >
                  <Ionicons name="refresh" size={20} color={WHATSAPP_COLORS.white} />
                  <Text style={styles.emptyButtonText}>
                    Show All {itemType}s
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Filter Modal */}
      <Modal
        visible={showFilterModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <TouchableOpacity 
          style={styles.filterModalOverlay}
          activeOpacity={1}
          onPress={() => setShowFilterModal(false)}
        >
          <View style={styles.filterModalContainer}>
            <View style={styles.filterModalHeader}>
              <Text style={styles.filterModalTitle}>Filter by Status</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <Ionicons name="close" size={24} color={WHATSAPP_COLORS.gray} />
              </TouchableOpacity>
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Select Status</Text>
              <View style={styles.filterOptions}>
                {['pending', 'in_progress', 'resolved', 'rejected', 'cancelled'].map((status) => (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.filterOption,
                      localFilter === status && styles.filterOptionActive
                    ]}
                    onPress={() => setLocalFilter(localFilter === status ? null : status)}
                  >
                    <Text style={[
                      styles.filterOptionText,
                      localFilter === status && styles.filterOptionTextActive
                    ]}>
                      {getStatusConfig(status).label} ({statusCounts[status as keyof typeof statusCounts]})
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.filterActionButtons}>
              <TouchableOpacity
                style={styles.filterResetButton}
                onPress={handleResetFilter}
              >
                <Text style={[styles.filterButtonText, { color: WHATSAPP_COLORS.darkGray }]}>
                  Reset
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.filterApplyButton}
                onPress={handleApplyFilter}
              >
                <Text style={styles.filterButtonText}>
                  Apply Filter
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};