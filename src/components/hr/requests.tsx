import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from './styles';
import { Item, TabType } from './types';
import { WHATSAPP_COLORS } from './constants';

interface RequestsProps {
  items: Item[];
  loading: boolean;
  onItemPress: (item: Item) => void;
  onCancelItem: (item: Item) => void;
  onCreateNew: () => void;
  activeTab: TabType;
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
  onCancelItem,
  onCreateNew,
  activeTab,
}) => {
  const itemType = activeTab === 'requests' ? 'Request' : 'Grievance';
  const itemTypeLower = activeTab.slice(0, -1);

  return (
    <View style={styles.content}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          style={styles.createNewCard}
          onPress={onCreateNew}
          activeOpacity={0.7}
        >
          <View style={styles.createNewIcon}>
            <Ionicons name="add-circle" size={28} color={WHATSAPP_COLORS.primary} />
          </View>
          <View style={styles.createNewContent}>
            <Text style={styles.createNewTitle}>
              Create New {itemType}
            </Text>
            <Text style={styles.createNewSubtitle}>
              Submit a new {itemTypeLower} to HR team
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={WHATSAPP_COLORS.gray} />
        </TouchableOpacity>

        <View style={styles.listSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Your {itemType}s
            </Text>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={WHATSAPP_COLORS.primary} />
              <Text style={styles.loadingText}>Loading {activeTab}...</Text>
            </View>
          ) : items.length > 0 ? (
            items.map((item) => {
              const statusConfig = getStatusConfig(item.status);
              const commentCount = item.comments?.length || 0;
              const showCancelInList = item.status === 'pending' || item.status === 'in_progress';

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
                    {showCancelInList && (
                      <TouchableOpacity
                        style={styles.itemCancelButton}
                        onPress={(e) => {
                          e.stopPropagation();
                          onCancelItem(item);
                        }}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="close-circle-outline" size={16} color={WHATSAPP_COLORS.red} />
                        <Text style={styles.itemCancelButtonText}>Cancel</Text>
                      </TouchableOpacity>
                    )}
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
                No {activeTab} yet
              </Text>
              <Text style={styles.emptySubtitle}>
                {activeTab === 'requests'
                  ? 'Submit your first request to HR team'
                  : 'Submit your first grievance to HR team'}
              </Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={onCreateNew}
                activeOpacity={0.7}
              >
                <Ionicons name="add" size={20} color={WHATSAPP_COLORS.white} />
                <Text style={styles.emptyButtonText}>
                  Create {itemType}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};